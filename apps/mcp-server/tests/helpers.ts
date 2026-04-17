import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import bcrypt from 'bcrypt';
import { runner } from 'node-pg-migrate';
import pg from 'pg';
import type { Logger } from 'pino';
import pino from 'pino';
import { Wait } from 'testcontainers';
import { afterAll, beforeAll } from 'vitest';
import { createMcpServer } from '../src/server.js';
import { createServices, type Services } from '../src/utils/service-factory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestContext {
  container: StartedPostgreSqlContainer;
  pool: pg.Pool;
  services: Services;
  logger: Logger;
  baseUrl: string;
  httpServer: http.Server;
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

const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

async function runMigrations(pool: pg.Pool): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const client = await pool.connect();
  try {
    await runner({
      dbClient: client,
      migrationsTable: 'pgmigrations',
      dir: migrationsDir,
      direction: 'up',
      count: Infinity,
      decamelize: true,
      logger: silentLogger,
    });
  } finally {
    client.release();
  }
}

async function createTestUserWithAppPassword(
  pool: pg.Pool,
  email: string,
): Promise<{ externalId: string; email: string; appPassword: string }> {
  const userPasswordHash = await bcrypt.hash('not-used-for-mcp', 10);

  // Create user in legacy table
  const userResult = await pool.query(
    'INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING id, external_id, email',
    [email, userPasswordHash],
  );
  const userId = userResult.rows[0].id;
  const externalId = userResult.rows[0].external_id;

  // Create user in Better Auth tables
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
  await pool.query('UPDATE auth.users SET self_profile_id = $1 WHERE id = $2', [
    profileResult.rows[0].id,
    userId,
  ]);
  await pool.query('UPDATE auth."user" SET self_profile_id = $1 WHERE id = $2', [
    profileResult.rows[0].id,
    externalId,
  ]);

  // Create app password via direct SQL (matching the service's create logic exactly)
  const rawPassword = crypto.randomBytes(24).toString('base64url');
  const passwordPrefix = rawPassword.substring(0, 8);
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
  _logger: Logger,
): Promise<{ server: http.Server; baseUrl: string }> {
  // Import the handler setup inline to avoid circular deps
  return new Promise((resolve) => {
    const { randomUUID } = crypto;

    interface Session {
      transport: import('@modelcontextprotocol/sdk/server/streamableHttp.js').StreamableHTTPServerTransport;
      userId: string;
    }
    const sessions = new Map<string, Session>();

    const httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (url.pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
        return;
      }

      // Authenticate
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Basic ')) {
        res.writeHead(401, {
          'WWW-Authenticate': 'Basic realm="Freundebuch MCP"',
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
      const colonIndex = decoded.indexOf(':');
      if (colonIndex === -1) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const email = decoded.slice(0, colonIndex);
      const password = decoded.slice(colonIndex + 1);

      const authResult = await services.appPasswords.verifyAppPassword(email, password);
      if (!authResult) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (req.method === 'POST') {
        const body = await new Promise<string>((resolveBody, reject) => {
          let data = '';
          req.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          req.on('end', () => resolveBody(data));
          req.on('error', reject);
        });

        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        const existingSession = sessionId ? sessions.get(sessionId) : undefined;
        if (existingSession) {
          if (existingSession.userId !== authResult.userId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }
          await existingSession.transport.handleRequest(req, res, parsedBody);
        } else {
          const { StreamableHTTPServerTransport } = await import(
            '@modelcontextprotocol/sdk/server/streamableHttp.js'
          );
          const newSessionId = randomUUID();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
          });

          const userId = authResult.userId;
          const server = createMcpServer(services, () => userId);
          sessions.set(newSessionId, { transport, userId });
          transport.onclose = () => sessions.delete(newSessionId);
          await server.connect(transport);
          await transport.handleRequest(req, res, parsedBody);
        }
      } else if (req.method === 'DELETE') {
        const deleteSession = sessionId ? sessions.get(sessionId) : undefined;
        if (!deleteSession) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found' }));
          return;
        }
        if (deleteSession.userId !== authResult.userId) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        await deleteSession.transport.handleRequest(req, res);
        sessions.delete(sessionId as string);
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    });

    httpServer.listen(0, () => {
      const addr = httpServer.address() as { port: number };
      resolve({ server: httpServer, baseUrl: `http://localhost:${addr.port}` });
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

export function setupMcpTestSuite() {
  let context: TestContext;

  beforeAll(async () => {
    const container = await new PostgreSqlContainer('imresamu/postgis:18-3.6.1-trixie')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .withStartupTimeout(120000)
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    const pool = new pg.Pool({
      connectionString: container.getConnectionUri(),
      min: 1,
      max: 5,
    });

    pool.on('error', () => {
      // Ignore — expected during test teardown
    });

    await runMigrations(pool);

    const logger: Logger = pino({ level: 'silent' });
    const services = createServices(pool, logger);

    const testUser = await createTestUserWithAppPassword(pool, 'mcp-test@example.com');
    const otherUser = await createTestUserWithAppPassword(pool, 'mcp-other@example.com');

    const { server: httpServer, baseUrl } = await startMcpHttpServer(services, logger);

    context = {
      container,
      pool,
      services,
      logger,
      baseUrl,
      httpServer,
      testUser,
      otherUser,
    };
  }, 120000);

  afterAll(async () => {
    if (context?.httpServer) {
      await new Promise<void>((resolve) => context.httpServer.close(() => resolve()));
    }
    if (context?.pool) {
      await context.pool.end();
    }
    if (context?.container) {
      await context.container.stop();
    }
  }, 120000);

  return { getContext: () => context };
}
