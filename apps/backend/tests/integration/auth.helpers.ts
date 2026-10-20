import crypto from 'node:crypto';
import { createRootLogger } from '@datenknoten/kit/logger';
import { type } from 'arktype';
import type { Hono } from 'hono';
import pg from 'pg';
import type { Logger } from 'pino';
import { afterAll, assert, beforeAll, inject } from 'vitest';
import { createApp } from '../../src/app.js';
import { type Config, loadConfig } from '../../src/config.js';
import { type Auth, createAuth } from '../../src/lib/auth.js';
import { createAuthPool } from '../../src/lib/auth-pool.js';
import type { AppContext } from '../../src/types/context.js';
import { TEST_AUTH_SECRET, TEST_ENV } from '../helpers/test-env.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

/** Better Auth's sign-up and sign-in body; `token` is null when no session was started. */
export const BetterAuthSessionResponseSchema = type({
  token: 'string | null',
  user: { id: 'string', email: 'string', name: 'string' },
});

/** Better Auth's own error body, which differs from the app's `ErrorResponse`. */
export const BetterAuthErrorResponseSchema = type({
  'code?': 'string',
  message: 'string',
});

/** The slice of the Hono app a request helper needs. */
export interface AppFetcher {
  fetch(request: Request): Response | Promise<Response>;
}

export interface AuthTestContext {
  pool: pg.Pool;
  authPool: pg.Pool;
  auth: Auth;
  config: Config;
  logger: Logger;
  app: Hono<AppContext>;
  /** Name of the per-suite database cloned from the migrated template. */
  databaseName: string;
}

/**
 * Connection URI of the shared Postgres server provided by global-setup. Every
 * integration suite goes through it — there is no per-file container fallback,
 * because starting one container per test file is both slow and impossible on
 * hosts where Docker cannot publish ports (global-setup accepts
 * TEST_DATABASE_URL for exactly that case).
 */
export function sharedServerUri() {
  return inject('pgContainerUri');
}

/** Swap the database name in a postgres connection URI. */
function withDatabase(uri: string, databaseName: string) {
  const url = new URL(uri);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/**
 * Clone a fresh database from the migrated `test` template. The template
 * already carries the full schema, so CREATE DATABASE ... TEMPLATE is
 * near-instant and every suite gets its own isolated database.
 *
 * The admin connection deliberately targets `postgres`, not the template:
 * CREATE DATABASE ... TEMPLATE requires zero other sessions on the source, so
 * connecting to `test` here would make concurrent workers fail with "source
 * database is being accessed by other users".
 */
export async function cloneTemplateDatabase() {
  const serverUri = sharedServerUri();
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

/** Drop a database created by {@link cloneTemplateDatabase}. */
export async function dropClonedDatabase(databaseName: string) {
  const adminPool = new pg.Pool({
    connectionString: withDatabase(sharedServerUri(), 'postgres'),
    max: 1,
  });
  try {
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  } finally {
    await adminPool.end();
  }
}

/**
 * Per-suite connection budget. With fileParallelism every worker runs its own
 * app, so `workers × (app pool + Better Auth pool)` has to stay under the
 * server's max_connections (100 by default): 4 + max(2, 4/2) = 6 per worker
 * leaves room for a full CPU's worth of workers plus psql sessions. A suite
 * never needs more — its requests are sequential.
 */
const TEST_POOL_MIN = 1;
const TEST_POOL_MAX = 4;

/**
 * Set up test environment: clone a fresh database from the migrated template
 * and boot the app against it. `env` adds or overrides config variables.
 */
export async function setupAuthTests(env: Record<string, string> = {}) {
  const { databaseName, databaseUri } = await cloneTemplateDatabase();

  const config = loadConfig({
    ...TEST_ENV,
    DATABASE_URL: databaseUri,
    DATABASE_POOL_MIN: String(TEST_POOL_MIN),
    DATABASE_POOL_MAX: String(TEST_POOL_MAX),
    // The budget above is deliberately small, so a suite that fires concurrent
    // requests queues on the Better Auth pool's two clients by design. Waiting
    // is correct; timing out is not. The 5s production default is far too tight
    // under v8 coverage instrumentation, which stretches a bcrypt-bound sign-in
    // roughly 15x (`should handle concurrent sign-in attempts`: 1.1s plain,
    // 17.8s instrumented) and turned queuing into a 500. With the wait
    // effectively unbounded, vitest's 30s testTimeout is the real limit, so a
    // pool that genuinely never yields a client fails as a timeout naming the
    // test rather than as an HTTP 500 that looks like a product bug.
    DATABASE_CONNECTION_TIMEOUT_MS: '60000',
    ...env,
  });
  const logger = createRootLogger(config);

  const pool = new pg.Pool({
    connectionString: databaseUri,
    min: TEST_POOL_MIN,
    max: TEST_POOL_MAX,
  });
  // Connection errors are expected while teardown drains the pool.
  pool.on('error', ignorePoolError);

  const authPool = createAuthPool({ config, logger });
  const auth = createAuth({ config, pool: authPool, logger });
  const app = await createApp({ config, logger, pool, authPool, auth });
  const context: AuthTestContext = { pool, authPool, auth, config, logger, app, databaseName };
  return context;
}

/** The single row an `INSERT … RETURNING` or lookup query must produce. */
export function firstRow<T extends pg.QueryResultRow>(result: pg.QueryResult<T>) {
  const [row] = result.rows;
  assert.isDefined(row, 'the query returned no row');
  return row;
}

export function ignorePoolError() {
  return undefined;
}

/** A second app over the suite's pools, with config variables changed for one test. */
export async function createAppWithConfig(context: AuthTestContext, overrides: Partial<Config>) {
  return createApp({ ...context, config: { ...context.config, ...overrides } });
}

/**
 * Tear down test environment: drain the pools and drop the cloned database.
 */
export async function teardownAuthTests(context: AuthTestContext | undefined) {
  if (context === undefined) {
    return;
  }
  // Drain Better Auth's pool before ending the app pool.
  await context.authPool.end();
  await context.pool.end();
  await dropClonedDatabase(context.databaseName);
}

/**
 * Helper to extract session token from cookie header.
 * Supports both Better Auth cookie names.
 */
export function extractSessionToken(cookieHeader: string | null) {
  if (cookieHeader === null || cookieHeader === '') {
    return null;
  }

  const match =
    cookieHeader.match(/better-auth\.session_token=([^;]+)/) ??
    cookieHeader.match(/__Secure-better-auth\.session_token=([^;]+)/) ??
    // Legacy fallback
    cookieHeader.match(/session_token=([^;]+)/);
  return match?.[1] ?? null;
}

/**
 * Helper to extract all cookies from set-cookie headers for use in subsequent requests
 */
export function extractCookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ');
}

/**
 * Drop Better Auth's `session_data` cache cookie, as a browser does after
 * sign-out sets its Max-Age to 0, so the server checks the session in the
 * database instead of trusting the cached copy.
 */
export function withoutSessionDataCookie(cookies: string) {
  return cookies
    .split('; ')
    .filter((cookie) => cookie.startsWith('better-auth.session_data=') === false)
    .join('; ');
}

/**
 * Helper to create a test user directly in the database.
 *
 * Allocates the legacy FK anchor first and reuses its UUID as the Better Auth
 * user id, mirroring what the `user.create.before` hook does in production
 * (ADR 0003).
 */
export async function createTestUser(pool: pg.Pool, email: string, passwordHash: string) {
  const result = await pool.query<{ external_id: string }>(
    'INSERT INTO auth.users DEFAULT VALUES RETURNING external_id',
  );
  const externalId = firstRow(result).external_id;

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
export async function getUserByEmail(pool: pg.Pool, email: string) {
  const result = await pool.query<{ id: string; email: string }>(
    'SELECT id, email FROM auth."user" WHERE email = $1',
    [email],
  );
  const [row] = result.rows;
  if (row === undefined) {
    return null;
  }

  return { externalId: row.id, email: row.email };
}

/**
 * Helper to complete onboarding for a test user by creating a self-profile
 * This is required for the user to pass the onboarding middleware
 */
export async function completeTestUserOnboarding(pool: pg.Pool, userExternalId: string) {
  const friendResult = await pool.query<{ id: string; external_id: string }>(
    `INSERT INTO friends.friends (user_id, display_name)
     SELECT u.id, 'Test User (Self)'
     FROM auth.users u
     WHERE u.external_id = $1::uuid
     RETURNING id, external_id`,
    [userExternalId],
  );

  const friend = firstRow(friendResult);
  const friendInternalId = friend.id;
  const friendId = friend.external_id;

  // self_profile_id lives only on the Better Auth row (ADR 0003).
  await pool.query(`UPDATE auth."user" SET self_profile_id = $1 WHERE id = $2`, [
    friendInternalId,
    userExternalId,
  ]);

  return friendId;
}

/**
 * Delete every user-owned row, leaving the migrated schema (and the system
 * collective types, which have no owner) intact.
 *
 * Suites share nothing but they do reuse one database across their own test
 * cases, so without this a test inherits whatever its predecessors created and
 * list/count assertions become order-dependent. Deletes are ordered
 * parent-last so a table that ever loses its ON DELETE CASCADE fails here
 * instead of leaking rows.
 */
export async function truncateUserData(pool: pg.Pool) {
  await pool.query(`
    DELETE FROM encounters.encounters;
    DELETE FROM collectives.collective_memberships;
    DELETE FROM collectives.collectives;
    DELETE FROM collectives.collective_types WHERE user_id IS NOT NULL;
    DELETE FROM friends.friend_relationships;
    UPDATE auth."user" SET self_profile_id = NULL WHERE self_profile_id IS NOT NULL;
    DELETE FROM friends.friends;
    DELETE FROM friends.circles;
    DELETE FROM friends.search_history;
    DELETE FROM friends.friend_changes;
    DELETE FROM system.notification_channels;
    DELETE FROM auth.app_passwords;
    DELETE FROM auth."user";
    DELETE FROM auth.users;
  `);
}

/**
 * Compute HMAC-SHA256 signature for Hono signed cookies.
 * Matches the algorithm used by Hono's setSignedCookie / getSignedCookie.
 */
async function makeHonoCookieSignature(value: string, secret: string) {
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
export async function createBetterAuthSession(pool: pg.Pool, userId: string) {
  const token = crypto.randomBytes(24).toString('base64url'); // ~32 chars, matching BA format
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(
    `INSERT INTO auth.session (id, user_id, token, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [sessionId, userId, token, expiresAt],
  );

  const signature = await makeHonoCookieSignature(token, TEST_AUTH_SECRET);
  const signedValue = encodeURIComponent(`${token}.${signature}`);
  return `better-auth.session_token=${signedValue}`;
}

/**
 * Setup function for beforeAll in test files
 */
export function setupAuthTestSuite(env: Record<string, string> = {}) {
  let context: AuthTestContext | undefined;

  beforeAll(async () => {
    context = await setupAuthTests(env);
  }, SUITE_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    await teardownAuthTests(context);
  }, SUITE_HOOK_TIMEOUT_MS);

  function getContext() {
    assert.isDefined(context, 'the suite context is set in beforeAll');
    return context;
  }

  return { getContext };
}
