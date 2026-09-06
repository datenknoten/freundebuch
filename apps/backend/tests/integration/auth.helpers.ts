import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { Hono } from 'hono';
import { runner } from 'node-pg-migrate';
import pg from 'pg';
import { Wait } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, inject, vi } from 'vitest';
import { createApp } from '../../src/index.js';
import { resetAuth } from '../../src/lib/auth.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';
import type { AppContext } from '../../src/types/context.js';
import { resetConfig } from '../../src/utils/config.js';
import { CONTAINER_STARTUP_TIMEOUT_MS, SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AuthTestContext {
  // Set only in the legacy per-file fallback (no shared container available).
  container?: StartedPostgreSqlContainer;
  pool: pg.Pool;
  app: Hono<AppContext>;
  // Set when this suite cloned its own database from the shared template.
  databaseName?: string;
}

/** Read the shared container URI provided by global-setup, if any. */
function sharedContainerUri(): string | undefined {
  try {
    return inject('pgContainerUri');
  } catch {
    return undefined;
  }
}

/** Swap the database name in a postgres connection URI. */
function withDatabase(uri: string, databaseName: string): string {
  const url = new URL(uri);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/**
 * Set up test environment. When the shared container from global-setup is
 * available, clone a fresh database from the migrated template (fast). Then
 * fall back to booting a dedicated container and migrating it per file.
 */
export async function setupAuthTests(): Promise<AuthTestContext> {
  const sharedUri = sharedContainerUri();
  if (sharedUri) {
    return setupFromSharedContainer(sharedUri);
  }
  return setupOwnContainer();
}

async function setupFromSharedContainer(sharedUri: string): Promise<AuthTestContext> {
  // Unique database name per suite for isolation; the template already has the
  // full migrated schema, so CREATE DATABASE ... TEMPLATE is near-instant.
  const databaseName = `test_${crypto.randomUUID().replace(/-/g, '')}`;

  const adminPool = new pg.Pool({ connectionString: sharedUri, max: 1 });
  try {
    await adminPool.query(`CREATE DATABASE "${databaseName}" TEMPLATE test`);
  } finally {
    await adminPool.end();
  }

  const databaseUri = withDatabase(sharedUri, databaseName);

  await resetAuth();
  vi.stubEnv('DATABASE_URL', databaseUri);
  resetConfig();

  const pool = new pg.Pool({ connectionString: databaseUri, min: 2, max: 10 });
  pool.on('error', () => {
    // Ignore — expected during teardown.
  });

  const app = await createApp(pool);
  return { pool, app, databaseName };
}

async function setupOwnContainer(): Promise<AuthTestContext> {
  // Uses the same image as docker-compose.yml for consistency.
  const container = await new PostgreSqlContainer('imresamu/postgis:18-3.6.1-trixie')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .withStartupTimeout(CONTAINER_STARTUP_TIMEOUT_MS)
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  await resetAuth();
  vi.stubEnv('DATABASE_URL', container.getConnectionUri());
  resetConfig();

  const pool = new pg.Pool({
    connectionString: container.getConnectionUri(),
    min: 2,
    max: 10,
  });
  pool.on('error', () => {
    // Ignore - expected during teardown when container stops.
  });

  await runMigrations(pool);
  const app = await createApp(pool);

  return { container, pool, app };
}

/**
 * Tear down test environment. Drops the cloned database (shared mode) or stops
 * the dedicated container (fallback mode).
 */
export async function teardownAuthTests(context: AuthTestContext): Promise<void> {
  if (!context) {
    return;
  }
  // Drain Better Auth's internal pool before ending the app pool.
  await resetAuth();
  if (context.pool) {
    await context.pool.end();
  }

  if (context.databaseName) {
    const sharedUri = sharedContainerUri();
    if (sharedUri) {
      const adminPool = new pg.Pool({ connectionString: sharedUri, max: 1 });
      try {
        await adminPool.query(`DROP DATABASE IF EXISTS "${context.databaseName}" WITH (FORCE)`);
      } finally {
        await adminPool.end();
      }
    }
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
 *
 * Allocates the legacy FK anchor first and reuses its UUID as the Better Auth
 * user id, mirroring what the `user.create.before` hook does in production
 * (ADR 0003).
 */
export async function createTestUser(
  pool: pg.Pool,
  email: string,
  passwordHash: string,
): Promise<{ externalId: string; email: string }> {
  const result = await pool.query('INSERT INTO auth.users DEFAULT VALUES RETURNING external_id');
  const externalId = result.rows[0].external_id;

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

  return { externalId, email };
}

/**
 * Helper to get a user's identity row by email
 */
export async function getUserByEmail(
  pool: pg.Pool,
  email: string,
): Promise<{ externalId: string; email: string } | null> {
  const result = await pool.query('SELECT id, email FROM auth."user" WHERE email = $1', [email]);

  if (result.rows.length === 0) {
    return null;
  }

  return {
    externalId: result.rows[0].id,
    email: result.rows[0].email,
  };
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
     WHERE u.external_id = $1::uuid
     RETURNING id, external_id`,
    [userExternalId],
  );

  const friendInternalId = friendResult.rows[0].id;
  const friendId = friendResult.rows[0].external_id;

  // self_profile_id lives only on the Better Auth row (ADR 0003).
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
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(() => {
    // Reset rate limiters before each test to avoid test interference
    resetRateLimiters();
  });

  afterAll(async () => {
    await teardownAuthTests(context);
    vi.unstubAllEnvs();
    resetConfig();
  }, SUITE_HOOK_TIMEOUT_MS);

  return {
    getContext: () => context,
  };
}
