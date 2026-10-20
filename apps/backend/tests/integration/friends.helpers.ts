import type pg from 'pg';
import { afterAll, assert, beforeAll, beforeEach } from 'vitest';

import {
  type AppFetcher,
  type AuthTestContext,
  completeTestUserOnboarding,
  createBetterAuthSession,
  createTestUser,
  firstRow,
  setupAuthTests,
  teardownAuthTests,
  truncateUserData,
} from './auth.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

export interface FriendsTestContext extends AuthTestContext {
  testUser: {
    externalId: string;
    email: string;
    sessionCookies: string;
  };
}

/**
 * Create a test user and return with session cookies for authentication
 */
export async function createAuthenticatedUser(pool: pg.Pool, email: string, _password: string) {
  // The stored account password is never verified in tests — sessions are
  // created directly via createBetterAuthSession — so a placeholder hash is
  // sufficient and avoids depending on the (removed) legacy bcrypt helper.
  const passwordHash = 'integration-test-password-not-verified';
  const user = await createTestUser(pool, email, passwordHash);
  const sessionCookies = await createBetterAuthSession(pool, user.externalId);

  return {
    externalId: user.externalId,
    email: user.email,
    sessionCookies,
  };
}

/**
 * Helper to create a friend directly in the database
 */
export async function createTestFriend(pool: pg.Pool, userExternalId: string, displayName: string) {
  const result = await pool.query<{ external_id: string }>(
    `INSERT INTO friends.friends (user_id, display_name)
     SELECT u.id, $2
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING external_id`,
    [userExternalId, displayName],
  );

  return firstRow(result).external_id;
}

/**
 * Helper to get friend from database
 */
export async function getTestFriend(pool: pg.Pool, friendExternalId: string) {
  const result = await pool.query<{ display_name: string; deleted_at: Date | null }>(
    'SELECT display_name, deleted_at FROM friends.friends WHERE external_id = $1',
    [friendExternalId],
  );

  const [row] = result.rows;
  if (row === undefined) {
    return null;
  }

  return { displayName: row.display_name, deletedAt: row.deleted_at };
}

/**
 * Helper to count friends for a user
 */
export async function countUserFriends(pool: pg.Pool, userExternalId: string) {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM friends.friends c
     JOIN auth.users u ON c.user_id = u.id
     WHERE u.external_id = $1 AND c.deleted_at IS NULL`,
    [userExternalId],
  );

  return Number.parseInt(firstRow(result).count, 10);
}

/**
 * Helper to make authenticated request using session cookies
 */
export function authHeaders(sessionCookies: string) {
  return {
    Cookie: sessionCookies,
    'Content-Type': 'application/json',
  };
}

/** Send a JSON request with a user's session cookies; `body` is serialised when given. */
export function sendAs(
  app: AppFetcher,
  sessionCookies: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const init: RequestInit = { method, headers: authHeaders(sessionCookies) };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return app.fetch(new Request(`http://localhost${path}`, init));
}

/**
 * Setup function for beforeAll in friends test files. `env` adds or overrides
 * config variables for the suite's app.
 */
export function setupFriendsTestSuite(env: Record<string, string> = {}) {
  let authContext: AuthTestContext | undefined;
  let context: FriendsTestContext | undefined;

  beforeAll(async () => {
    authContext = await setupAuthTests(env);
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    // Wipe every user-owned row, then rebuild the fixture user: a test must not
    // inherit rows (or a session) from its predecessors.
    assert.isDefined(authContext, 'the suite context is set in beforeAll');
    await truncateUserData(authContext.pool);
    const testUser = await createAuthenticatedUser(
      authContext.pool,
      'friends-test@example.com',
      'SecurePassword123',
    );
    await completeTestUserOnboarding(authContext.pool, testUser.externalId);
    context = { ...authContext, testUser };
  });

  afterAll(async () => {
    await teardownAuthTests(authContext);
  }, SUITE_HOOK_TIMEOUT_MS);

  function getContext() {
    assert.isDefined(context, 'the test context is set in beforeEach');
    return context;
  }

  return { getContext };
}
