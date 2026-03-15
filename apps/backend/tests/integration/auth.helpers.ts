import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { Hono } from 'hono';
import { runner } from 'node-pg-migrate';
import pg from 'pg';
import { Wait } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import { createApp } from '../../src/index.js';
import { resetAuth } from '../../src/lib/auth.js';
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
  // Start PostGIS container (required for geodata migration)
  // Uses the same image as docker-compose.yml for consistency
  const container = await new PostgreSqlContainer('imresamu/postgis:18-3.6.1-trixie')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .withStartupTimeout(120000)
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  // Reset any existing auth singleton so it reconnects to this container's DB
  await resetAuth();

  // Set DATABASE_URL from the container
  vi.stubEnv('DATABASE_URL', container.getConnectionUri());
  resetConfig();

  // Create connection pool
  const pool = new pg.Pool({
    connectionString: container.getConnectionUri(),
    min: 2,
    max: 10,
  });

  // Suppress pool errors during container shutdown (e.g., "terminating connection due to administrator command")
  pool.on('error', () => {
    // Ignore - expected during test teardown when container stops
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
  if (!context) {
    return;
  }
  // Drain Better Auth's internal pool before ending the app pool / stopping the container
  await resetAuth();
  if (context.pool) {
    await context.pool.end();
  }
  if (context.container) {
    await context.container.stop();
  }
}

/**
 * Silent logger for migrations during tests - suppresses migration output
 */
const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

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
      logger: silentLogger,
    });
  } finally {
    client.release();
  }
}

/**
 * Helper to extract session token from cookie header.
 * Supports both Better Auth cookie names.
 */
export function extractSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  // Better Auth uses 'better-auth.session_token' or '__Secure-better-auth.session_token'
  const match =
    cookieHeader.match(/better-auth\.session_token=([^;]+)/) ||
    cookieHeader.match(/__Secure-better-auth\.session_token=([^;]+)/) ||
    // Legacy fallback
    cookieHeader.match(/session_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Helper to extract all cookies from set-cookie headers for use in subsequent requests
 */
export function extractCookies(response: Response): string {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  return setCookieHeaders.map((h) => h.split(';')[0]).join('; ');
}

/**
 * Helper to create a test user directly in the database.
 * Inserts into both legacy auth.users and Better Auth auth.user/account tables.
 */
export async function createTestUser(
  pool: pg.Pool,
  email: string,
  passwordHash: string,
): Promise<{ externalId: string; email: string }> {
  // Insert into legacy table (still needed for FK references from other schemas)
  const result = await pool.query(
    'INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING external_id, email',
    [email, passwordHash],
  );

  const externalId = result.rows[0].external_id;

  // Also insert into Better Auth tables
  await pool.query(
    `INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, false, NOW(), NOW())`,
    [externalId, email.split('@')[0], email],
  );
  await pool.query(
    `INSERT INTO auth.account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES (gen_random_uuid()::text, $1, 'credential', $1, $2, NOW(), NOW())`,
    [externalId, passwordHash],
  );

  return {
    externalId,
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
 * Helper to complete onboarding for a test user by creating a self-profile
 * This is required for the user to pass the onboarding middleware
 */
export async function completeTestUserOnboarding(
  pool: pg.Pool,
  userExternalId: string,
): Promise<string> {
  // Create a self-profile for the user
  const friendResult = await pool.query(
    `INSERT INTO friends.friends (user_id, display_name)
     SELECT u.id, 'Test User (Self)'
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING id, external_id`,
    [userExternalId],
  );

  const friendInternalId = friendResult.rows[0].id;
  const friendId = friendResult.rows[0].external_id;

  // Set it as the user's self-profile (legacy table)
  await pool.query(
    `UPDATE auth.users u
     SET self_profile_id = f.id
     FROM friends.friends f
     WHERE u.external_id = $1
       AND f.external_id = $2`,
    [userExternalId, friendId],
  );

  // Also update Better Auth user table
  await pool.query(`UPDATE auth."user" SET self_profile_id = $1 WHERE id = $2`, [
    friendInternalId,
    userExternalId,
  ]);

  return friendId;
}

/**
 * Compute HMAC-SHA256 signature for Hono signed cookies.
 * Matches the algorithm used by Hono's setSignedCookie / getSignedCookie.
 */
async function makeHonoCookieSignature(value: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Create a Better Auth session directly in the database and return session cookies.
 * This bypasses the sign-in flow for test setup.
 *
 * The cookie must be signed with HMAC-SHA256 to match how Better Auth / Hono
 * sets and reads signed cookies (via setSignedCookie / getSignedCookie).
 */
export async function createBetterAuthSession(pool: pg.Pool, userId: string): Promise<string> {
  const token = crypto.randomBytes(24).toString('base64url'); // ~32 chars, matching BA format
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(
    `INSERT INTO auth.session (id, user_id, token, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [sessionId, userId, token, expiresAt],
  );

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET must be set for test session creation');
  const signature = await makeHonoCookieSignature(token, secret);
  const signedValue = encodeURIComponent(`${token}.${signature}`);
  return `better-auth.session_token=${signedValue}`;
}

/**
 * Setup function for beforeAll in test files
 */
export function setupAuthTestSuite() {
  let context: AuthTestContext;

  beforeAll(async () => {
    // Set required environment variables for tests
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
    vi.stubEnv('JWT_EXPIRY', '604800');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();
  }, 120000); // 120 second timeout for container startup

  beforeEach(() => {
    // Reset rate limiters before each test to avoid test interference
    resetRateLimiters();
  });

  afterAll(async () => {
    await teardownAuthTests(context);
    vi.unstubAllEnvs();
    resetConfig();
  }, 120000);

  return {
    getContext: () => context,
  };
}
