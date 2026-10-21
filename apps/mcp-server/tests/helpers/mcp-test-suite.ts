import crypto from 'node:crypto';
import http from 'node:http';
import { parseJson, parseWith } from '@datenknoten/kit/schema';
import { type Auth, createAuth } from '@freundebuch/backend/lib/auth.js';
import { createAuthPool } from '@freundebuch/backend/lib/auth-pool.js';
import { type Type, type } from 'arktype';
import bcrypt from 'bcrypt';
import pg from 'pg';
import type { Logger } from 'pino';
import pino from 'pino';
import { afterAll, beforeAll, inject } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { createMcpRequestHandler } from '../../src/http-handler.js';
import type { Session } from '../../src/session.js';
import { createServices, type Services } from '../../src/utils/service-factory.js';
import { TEST_ENV } from './test-env.js';
import { TestSetupError } from './test-setup.error.js';

/**
 * Suite hooks only clone a database and boot an in-process HTTP server now, but
 * the very first suite may still wait on global-setup's container start.
 */
const SUITE_HOOK_TIMEOUT_MS = 120_000;

export interface TestContext {
  pool: pg.Pool;
  authPool: pg.Pool;
  services: Services;
  logger: Logger;
  baseUrl: string;
  httpServer: http.Server;
  /** Name of the per-suite database cloned from the migrated template. */
  databaseName: string;
  testUser: TestUser;
  otherUser: TestUser;
}

/** Swap the database name in a postgres connection URI. */
function withDatabase(uri: string, databaseName: string) {
  const url = new URL(uri);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/**
 * Clone a fresh database from the template global-setup migrated once. The
 * template carries the full schema, so this is near-instant compared to
 * booting a container and replaying every migration per test file.
 *
 * The admin connection targets `postgres`, not the template: CREATE DATABASE
 * ... TEMPLATE requires zero other sessions on the source database.
 */
async function cloneTemplateDatabase() {
  const serverUri = inject('pgContainerUri');
  const databaseName = `test_${crypto.randomUUID().replace(/-/g, '')}`;

  const adminPool = new pg.Pool({
    connectionString: withDatabase(serverUri, 'postgres'),
    max: 1,
  });
  try {
    await adminPool.query(`CREATE DATABASE "${databaseName}" TEMPLATE test`);
  } finally {
    await adminPool.end();
  }

  return { databaseName, databaseUri: withDatabase(serverUri, databaseName) };
}

async function dropClonedDatabase(databaseName: string) {
  const adminPool = new pg.Pool({
    connectionString: withDatabase(inject('pgContainerUri'), 'postgres'),
    max: 1,
  });
  try {
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  } finally {
    await adminPool.end();
  }
}

interface TestUser {
  externalId: string;
  email: string;
  // Raw password in xxxx-xxxx-xxxx-xxxx format.
  appPassword: string;
}

async function insertReturningRow<Row extends pg.QueryResultRow>(
  pool: pg.Pool,
  sql: string,
  values: unknown[] = [],
) {
  const result = await pool.query<Row>(sql, values);
  const [row] = result.rows;
  if (row === undefined) {
    throw new TestSetupError('INSERT returned no row', { code: 'TEST_SEED_FAILED' });
  }
  return row;
}

async function createTestUserWithAppPassword(pool: pg.Pool, email: string) {
  // Allocate the legacy FK anchor, then adopt its UUID as the Better Auth user
  // id (ADR 0003).
  const { id: userId, external_id: externalId } = await insertReturningRow<{
    id: number;
    external_id: string;
  }>(pool, 'INSERT INTO auth.users DEFAULT VALUES RETURNING id, external_id');

  await pool.query(
    `INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, false, NOW(), NOW())`,
    [externalId, email.split('@')[0], email],
  );

  // The services require a self-profile.
  const profile = await insertReturningRow<{ id: number }>(
    pool,
    `INSERT INTO friends.friends (user_id, display_name)
     VALUES ($1, $2)
     RETURNING id, external_id`,
    [userId, `${email.split('@')[0]} (Self)`],
  );
  await pool.query('UPDATE auth."user" SET self_profile_id = $1 WHERE id = $2', [
    profile.id,
    externalId,
  ]);

  // Mirrors AppPasswordsService's create logic exactly.
  const rawPassword = crypto.randomBytes(24).toString('base64url');
  // Stored prefix is the hashed lookup key, not the raw characters (5.6).
  const passwordPrefix = crypto
    .createHash('sha256')
    .update(rawPassword.substring(0, 8))
    .digest('hex')
    .slice(0, 16);
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  await pool.query(
    `INSERT INTO auth.app_passwords (user_id, name, password_hash, password_prefix)
     VALUES ($1, 'Test MCP', $2, $3)`,
    [userId, passwordHash, passwordPrefix],
  );

  // Same format as AppPasswordsService.formatPassword.
  const chunks: string[] = [];
  for (let i = 0; i < rawPassword.length; i += 4) {
    chunks.push(rawPassword.slice(i, i + 4));
  }
  const formattedPassword = chunks.join('-');

  return { externalId, email, appPassword: formattedPassword } satisfies TestUser;
}

interface StartedServer {
  server: http.Server;
  baseUrl: string;
  sessions: Map<string, Session>;
}

function startMcpHttpServer(services: Services, logger: Logger, pool: pg.Pool, auth: Auth) {
  return new Promise<StartedServer>((resolve, reject) => {
    const sessions = new Map<string, Session>();
    const handler = createMcpRequestHandler({ services, logger, sessions, pool, auth });
    const httpServer = http.createServer(handler);

    function onListening() {
      const address = httpServer.address();
      if (address === null || typeof address === 'string') {
        reject(
          new TestSetupError('Test server has no TCP address', { code: 'TEST_SERVER_FAILED' }),
        );
        return;
      }
      resolve({ server: httpServer, baseUrl: `http://localhost:${address.port}`, sessions });
    }
    httpServer.listen(0, onListening);
  });
}

function closeHttpServer(httpServer: http.Server) {
  return new Promise<void>((resolve) => {
    function onClosed() {
      resolve();
    }
    httpServer.close(onClosed);
  });
}

export function basicAuthHeader(email: string, password: string) {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

export async function mcpRequest(
  baseUrl: string,
  body: unknown,
  options: { email: string; password: string; sessionId?: string },
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: basicAuthHeader(options.email, options.password),
  };
  if (options.sessionId !== undefined && options.sessionId !== '') {
    headers['mcp-session-id'] = options.sessionId;
  }

  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let responseBody: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') === true) {
    responseBody = await response.json();
  } else if (contentType.includes('text/event-stream') === true) {
    // The JSON-RPC result is the last parseable SSE data line.
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') === true) {
        try {
          responseBody = JSON.parse(line.slice(6));
        } catch {
          // keep trying subsequent data lines
        }
      }
    }
  } else {
    responseBody = await response.text();
  }

  const result: { status: number; headers: Headers; body: unknown } = {
    status: response.status,
    headers: response.headers,
    body: responseBody,
  };
  return result;
}

/**
 * Initialize an MCP session and return the session ID.
 *
 * Uses raw fetch (not mcpRequest) to ensure the SSE response body
 * is fully consumed before returning. This prevents connection pool
 * issues with Node.js fetch/undici on SSE streams.
 */
export async function initMcpSession(baseUrl: string, email: string, password: string) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: basicAuthHeader(email, password),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    }),
  });

  // Draining the SSE stream keeps undici's connection pool healthy.
  await response.text();

  const sessionId = response.headers.get('mcp-session-id');
  if (sessionId === null || sessionId === '') {
    throw new TestSetupError('No session ID returned from initialize', {
      code: 'TEST_SESSION_FAILED',
      details: { status: response.status },
    });
  }
  return sessionId;
}

export async function callTool(
  baseUrl: string,
  toolName: string,
  args: Record<string, unknown>,
  options: { email: string; password: string; sessionId: string },
) {
  const { status, body } = await mcpRequest(
    baseUrl,
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    },
    options,
  );
  return { status, body };
}

/**
 * Revoke all app passwords for a user. Used in tests that need to simulate a
 * revoked credential; paired with `restoreAppPasswordsForUser` in a try/finally.
 */
export async function revokeAppPasswordsForUser(pool: pg.Pool, userExternalId: string) {
  await pool.query(
    `UPDATE auth.app_passwords ap
       SET revoked_at = NOW()
       FROM auth.users u
       WHERE ap.user_id = u.id AND u.external_id = $1`,
    [userExternalId],
  );
}

export async function restoreAppPasswordsForUser(pool: pg.Pool, userExternalId: string) {
  await pool.query(
    `UPDATE auth.app_passwords ap
       SET revoked_at = NULL
       FROM auth.users u
       WHERE ap.user_id = u.id AND u.external_id = $1`,
    [userExternalId],
  );
}

/**
 * Delete seeded encounters, circles, and friends for a set of users while
 * preserving their self-profiles. Junction tables (encounter_friends,
 * friend_circles) cascade with their parents so we don't need to clean them
 * explicitly.
 */
export async function cleanupUserData(pool: pg.Pool, userExternalIds: string[]) {
  if (userExternalIds.length === 0) {
    return;
  }
  await pool.query(
    `DELETE FROM encounters.encounters
       WHERE user_id IN (SELECT id FROM auth.users WHERE external_id = ANY($1::uuid[]))`,
    [userExternalIds],
  );
  await pool.query(
    `DELETE FROM friends.circles
       WHERE user_id IN (SELECT id FROM auth.users WHERE external_id = ANY($1::uuid[]))`,
    [userExternalIds],
  );
  await pool.query(
    `DELETE FROM friends.friends f
       WHERE f.user_id IN (SELECT id FROM auth.users WHERE external_id = ANY($1::uuid[]))
         AND f.id NOT IN (SELECT self_profile_id FROM auth."user" WHERE self_profile_id IS NOT NULL)`,
    [userExternalIds],
  );
}

export function setupMcpTestSuite() {
  let context: TestContext | undefined;

  beforeAll(async () => {
    const { databaseName, databaseUri } = await cloneTemplateDatabase();

    const pool = new pg.Pool({
      connectionString: databaseUri,
      min: 1,
      max: 5,
    });

    const poolLogger = pino({ level: 'silent' });
    function onPoolError(err: Error) {
      poolLogger.error({ err }, 'pg pool error during MCP integration test');
    }
    pool.on('error', onPoolError);

    const config = loadConfig({ ...TEST_ENV, DATABASE_URL: databaseUri });
    const logger = pino({ level: 'silent' });
    const services = createServices({ db: pool, logger, photoConfig: config });
    const authPool = createAuthPool({ config, logger });
    const auth = createAuth({ config, pool: authPool, logger });

    const testUser = await createTestUserWithAppPassword(pool, 'mcp-test@example.com');
    const otherUser = await createTestUserWithAppPassword(pool, 'mcp-other@example.com');

    const { server: httpServer, baseUrl } = await startMcpHttpServer(services, logger, pool, auth);

    context = {
      databaseName,
      pool,
      authPool,
      services,
      logger,
      baseUrl,
      httpServer,
      testUser,
      otherUser,
    };
  }, SUITE_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    if (context === undefined) {
      return;
    }
    await closeHttpServer(context.httpServer);
    await context.pool.end();
    await context.authPool.end();
    await dropClonedDatabase(context.databaseName);
  }, SUITE_HOOK_TIMEOUT_MS);

  function getContext() {
    if (context === undefined) {
      throw new TestSetupError('MCP test suite is not set up', { code: 'TEST_SUITE_NOT_READY' });
    }
    return context;
  }

  return { getContext };
}

const ToolCallBodySchema = type({
  'result?': {
    'content?': type({ 'text?': 'string' }).array(),
    'isError?': 'boolean',
  },
});

const ToolsListBodySchema = type({
  'result?': { 'tools?': type({ name: 'string' }).array() },
});

export function parseToolCall(body: unknown) {
  const { result } = parseWith(ToolCallBodySchema, body);
  return { text: result?.content?.[0]?.text, isError: result?.isError };
}

export function parseToolJson<S extends Type>(schema: S, body: unknown) {
  const { text } = parseToolCall(body);
  if (text === undefined) {
    throw new TestSetupError('Tool result has no text content', { code: 'TEST_TOOL_RESULT_EMPTY' });
  }
  const parsed: S['infer'] = parseJson(schema, text);
  return parsed;
}

export function parseToolNames(body: unknown) {
  const { result } = parseWith(ToolsListBodySchema, body);
  return result?.tools?.map((tool) => tool.name);
}

export async function insertFriend(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  nickname?: string,
) {
  const row = await insertReturningRow<{ external_id: string }>(
    pool,
    `INSERT INTO friends.friends (user_id, display_name, nickname)
     SELECT u.id, $2, $3 FROM auth.users u WHERE u.external_id = $1
     RETURNING external_id`,
    [userExternalId, displayName, nickname ?? null],
  );
  return row.external_id;
}
