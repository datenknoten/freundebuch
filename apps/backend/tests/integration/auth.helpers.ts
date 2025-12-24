import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { Hono } from 'hono';
import { runner } from 'node-pg-migrate';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { createApp } from '../../src/index.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';
import type { AppContext } from '../../src/types/context.js';
import { resetConfig } from '../../src/utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AuthTestContext {
  container: StartedPostgreSqlContainer;
  pool: pg.Pool;
  app: Hono<AppContext>;
}

/**
 * Set up test environment with PostgreSQL container and app
 */
export async function setupAuthTests(): Promise<AuthTestContext> {
  // Start PostgreSQL container
  const container = await new PostgreSqlContainer('postgres:18-bookworm')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .withStartupTimeout(120000)
    .start();

  // Set DATABASE_URL from the container
  process.env.DATABASE_URL = container.getConnectionUri();
  resetConfig();

  // Create connection pool
  const pool = new pg.Pool({
    connectionString: container.getConnectionUri(),
    min: 2,
    max: 10,
  });

  // Run migrations
  await runMigrations(pool);

  // Create the Hono app
  const app = await createApp(pool);

  return { container, pool, app };
}

/**
 * Tear down test environment
 */
export async function teardownAuthTests(context: AuthTestContext): Promise<void> {
  if (context.pool) {
    await context.pool.end();
  }
  if (context.container) {
    await context.container.stop();
  }
}

/**
 * Run database migrations using node-pg-migrate
 */
async function runMigrations(pool: pg.Pool): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../../../database/migrations');

  const client = await pool.connect();

  try {
    await runner({
      dbClient: client,
      migrationsTable: 'pgmigrations',
      dir: migrationsDir,
      direction: 'up',
      count: Infinity,
      decamelize: true,
    });
  } finally {
    client.release();
  }
}

/**
 * Helper to extract session token from cookie header
 */
export function extractSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/session_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Helper to create a test user directly in the database
 */
export async function createTestUser(
  pool: pg.Pool,
  email: string,
  passwordHash: string,
): Promise<{ externalId: string; email: string }> {
  const result = await pool.query(
    'INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING external_id, email',
    [email, passwordHash],
  );

  return {
    externalId: result.rows[0].external_id,
    email: result.rows[0].email,
  };
}

/**
 * Helper to create a test session directly in the database
 */
export async function createTestSession(
  pool: pg.Pool,
  userExternalId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  // First get the internal user ID
  const userResult = await pool.query('SELECT id FROM auth.users WHERE external_id = $1', [
    userExternalId,
  ]);

  if (userResult.rows.length === 0) {
    throw new Error(`User not found: ${userExternalId}`);
  }

  const userId = userResult.rows[0].id;

  await pool.query(
    'INSERT INTO auth.sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt],
  );
}

/**
 * Helper to create a test password reset token directly in the database
 */
export async function createTestPasswordResetToken(
  pool: pg.Pool,
  userExternalId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  // First get the internal user ID
  const userResult = await pool.query('SELECT id FROM auth.users WHERE external_id = $1', [
    userExternalId,
  ]);

  if (userResult.rows.length === 0) {
    throw new Error(`User not found: ${userExternalId}`);
  }

  const userId = userResult.rows[0].id;

  await pool.query(
    'INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt],
  );
}

/**
 * Helper to get user from database by email
 */
export async function getUserByEmail(
  pool: pg.Pool,
  email: string,
): Promise<{ externalId: string; email: string; passwordHash: string } | null> {
  const result = await pool.query(
    'SELECT external_id, email, password_hash FROM auth.users WHERE email = $1',
    [email],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    externalId: result.rows[0].external_id,
    email: result.rows[0].email,
    passwordHash: result.rows[0].password_hash,
  };
}

/**
 * Helper to count sessions for a user
 */
export async function countUserSessions(pool: pg.Pool, userExternalId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) FROM auth.sessions s JOIN auth.users u ON s.user_id = u.id WHERE u.external_id = $1',
    [userExternalId],
  );

  return parseInt(result.rows[0].count, 10);
}

/**
 * Helper to check if session exists
 */
export async function sessionExists(pool: pg.Pool, tokenHash: string): Promise<boolean> {
  const result = await pool.query('SELECT id FROM auth.sessions WHERE token_hash = $1', [
    tokenHash,
  ]);

  return result.rows.length > 0;
}

/**
 * Setup function for beforeAll in test files
 */
export function setupAuthTestSuite() {
  let context: AuthTestContext;

  beforeAll(async () => {
    // Set required environment variables for tests
    process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-1';
    process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-1';
    process.env.JWT_EXPIRY = '604800';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    context = await setupAuthTests();
  }, 120000); // 120 second timeout for container startup

  beforeEach(() => {
    // Reset rate limiters before each test to avoid test interference
    resetRateLimiters();
  });

  afterAll(async () => {
    await teardownAuthTests(context);
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.JWT_EXPIRY;
    delete process.env.FRONTEND_URL;
    delete process.env.DATABASE_URL;
    resetConfig();
  }, 120000);

  return {
    getContext: () => context,
  };
}
