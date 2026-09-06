import crypto from 'node:crypto';
import http from 'node:http';
import bcrypt from 'bcrypt';
import pg from 'pg';
import type { Logger } from 'pino';
import pino from 'pino';
import { afterAll, beforeAll, inject } from 'vitest';
import { createMcpRequestHandler, type Session } from '../src/http-handler.js';
import { createServices, type Services } from '../src/utils/service-factory.js';

/**
 * Suite hooks only clone a database and boot an in-process HTTP server now, but
 * the very first suite may still wait on global-setup's container start.
 */
const SUITE_HOOK_TIMEOUT_MS = 120_000;

export interface TestContext {
  pool: pg.Pool;
  services: Services;
  logger: Logger;
  baseUrl: string;
  httpServer: http.Server;
  /** Name of the per-suite database cloned from the migrated template. */
  databaseName: string;
  testUser: {
    externalId: string;
    email: string;
    appPassword: string; // raw password in xxxx-xxxx-xxxx-xxxx format
  };
  otherUser: {
    externalId: string;
    email: string;
    appPassword: string;
  };
}

/** Swap the database name in a postgres connection URI. */
function withDatabase(uri: string, databaseName: string): string {
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
async function cloneTemplateDatabase(): Promise<{ databaseName: string; databaseUri: string }> {
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

async function dropClonedDatabase(databaseName: string): Promise<void> {
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

async function createTestUserWithAppPassword(
  pool: pg.Pool,
  email: string,
): Promise<{ externalId: string; email: string; appPassword: string }> {
  // Allocate the legacy FK anchor, then adopt its UUID as the Better Auth user
  // id (ADR 0003).
  const userResult = await pool.query(
    'INSERT INTO auth.users DEFAULT VALUES RETURNING id, external_id',
  );
  const userId = userResult.rows[0].id;
  const externalId = userResult.rows[0].external_id;

  await pool.query(
    `INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, false, NOW(), NOW())`,
    [externalId, email.split('@')[0], email],
  );

  // Create self-profile (required for services to work)
  const profileResult = await pool.query(
    `INSERT INTO friends.friends (user_id, display_name)
     VALUES ($1, $2)
     RETURNING id, external_id`,
    [userId, `${email.split('@')[0]} (Self)`],
  );
  await pool.query('UPDATE auth."user" SET self_profile_id = $1 WHERE id = $2', [
    profileResult.rows[0].id,
    externalId,
  ]);

  // Create app password via direct SQL (matching the service's create logic exactly)
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

  // Format as xxxx-xxxx-xxxx-xxxx (same as AppPasswordsService.formatPassword)
  const chunks: string[] = [];
  for (let i = 0; i < rawPassword.length; i += 4) {
    chunks.push(rawPassword.slice(i, i + 4));
  }
  const formattedPassword = chunks.join('-');

  return { externalId, email, appPassword: formattedPassword };
}

function startMcpHttpServer(
  services: Services,
  logger: Logger,
  pool: pg.Pool,
): Promise<{ server: http.Server; baseUrl: string; sessions: Map<string, Session> }> {
  return new Promise((resolve) => {
    const sessions = new Map<string, Session>();
    const handler = createMcpRequestHandler({ services, logger, sessions, pool });
    const httpServer = http.createServer(handler);

    httpServer.listen(0, () => {
      const addr = httpServer.address() as { port: number };
      resolve({ server: httpServer, baseUrl: `http://localhost:${addr.port}`, sessions });
    });
  });
}

export function basicAuthHeader(email: string, password: string): string {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

/**
 * Send an MCP JSON-RPC request and return the parsed response
 */
export async function mcpRequest(
  baseUrl: string,
  body: unknown,
  options: { email: string; password: string; sessionId?: string },
): Promise<{ status: number; headers: Headers; body: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: basicAuthHeader(options.email, options.password),
  };
  if (options.sessionId) {
    headers['mcp-session-id'] = options.sessionId;
  }

  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let responseBody: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    responseBody = await response.json();
  } else if (contentType.includes('text/event-stream')) {
    // Parse SSE response to extract JSON-RPC result
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
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

  return { status: response.status, headers: response.headers, body: responseBody };
}

/**
 * Initialize an MCP session and return the session ID.
 *
 * Uses raw fetch (not mcpRequest) to ensure the SSE response body
 * is fully consumed before returning. This prevents connection pool
 * issues with Node.js fetch/undici on SSE streams.
 */
export async function initMcpSession(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
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

  // Fully consume the response body to drain the SSE stream
  await response.text();

  const sessionId = response.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error(`No session ID returned from initialize (status: ${response.status})`);
  }
  return sessionId;
}

/**
 * Call an MCP tool and return the result
 */
export async function callTool(
  baseUrl: string,
  toolName: string,
  args: Record<string, unknown>,
  options: { email: string; password: string; sessionId: string },
): Promise<{ status: number; body: unknown }> {
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
export async function revokeAppPasswordsForUser(
  pool: pg.Pool,
  userExternalId: string,
): Promise<void> {
  await pool.query(
    `UPDATE auth.app_passwords ap
       SET revoked_at = NOW()
       FROM auth.users u
       WHERE ap.user_id = u.id AND u.external_id = $1`,
    [userExternalId],
  );
}

export async function restoreAppPasswordsForUser(
  pool: pg.Pool,
  userExternalId: string,
): Promise<void> {
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
export async function cleanupUserData(pool: pg.Pool, userExternalIds: string[]): Promise<void> {
  if (userExternalIds.length === 0) return;
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
  let context: TestContext;

  beforeAll(async () => {
    const { databaseName, databaseUri } = await cloneTemplateDatabase();

    const pool = new pg.Pool({
      connectionString: databaseUri,
      min: 1,
      max: 5,
    });

    const poolLogger = pino({ level: 'silent' });
    pool.on('error', (err) => {
      poolLogger.error({ err }, 'pg pool error during MCP integration test');
    });

    const logger: Logger = pino({ level: 'silent' });
    const services = createServices(pool, logger);

    const testUser = await createTestUserWithAppPassword(pool, 'mcp-test@example.com');
    const otherUser = await createTestUserWithAppPassword(pool, 'mcp-other@example.com');

    const { server: httpServer, baseUrl } = await startMcpHttpServer(services, logger, pool);

    context = {
      databaseName,
      pool,
      services,
      logger,
      baseUrl,
      httpServer,
      testUser,
      otherUser,
    };
  }, SUITE_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    if (context?.httpServer) {
      await new Promise<void>((resolve) => context.httpServer.close(() => resolve()));
    }
    if (context?.pool) {
      await context.pool.end();
    }
    if (context?.databaseName) {
      await dropClonedDatabase(context.databaseName);
    }
  }, SUITE_HOOK_TIMEOUT_MS);

  return { getContext: () => context };
}
