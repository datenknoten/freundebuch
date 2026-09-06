import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';
import { resetConfig } from '../../src/utils/config.js';
import {
  type AuthTestContext,
  completeTestUserOnboarding,
  createBetterAuthSession,
  createTestUser,
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
export async function createAuthenticatedUser(
  pool: pg.Pool,
  email: string,
  _password: string,
): Promise<{ externalId: string; email: string; sessionCookies: string }> {
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
export async function createTestFriend(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO friends.friends (user_id, display_name)
     SELECT u.id, $2
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING external_id`,
    [userExternalId, displayName],
  );

  return result.rows[0].external_id;
}

/**
 * Helper to get friend from database
 */
export async function getTestFriend(
  pool: pg.Pool,
  friendExternalId: string,
): Promise<{ displayName: string; deletedAt: Date | null } | null> {
  const result = await pool.query(
    'SELECT display_name, deleted_at FROM friends.friends WHERE external_id = $1',
    [friendExternalId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    displayName: result.rows[0].display_name,
    deletedAt: result.rows[0].deleted_at,
  };
}

/**
 * Helper to count friends for a user
 */
export async function countUserFriends(pool: pg.Pool, userExternalId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) FROM friends.friends c
     JOIN auth.users u ON c.user_id = u.id
     WHERE u.external_id = $1 AND c.deleted_at IS NULL`,
    [userExternalId],
  );

  return Number.parseInt(result.rows[0].count, 10);
}

/**
 * Helper to make authenticated request using session cookies
 */
export function authHeaders(sessionCookies: string): Record<string, string> {
  return {
    Cookie: sessionCookies,
    'Content-Type': 'application/json',
  };
}

/**
 * Setup function for beforeAll in friends test files
 */
export function setupFriendsTestSuite() {
  let authContext: AuthTestContext;
  let context: FriendsTestContext;

  beforeAll(async () => {
    // Set required environment variables for tests
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    authContext = await setupAuthTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    resetRateLimiters();
    // Wipe every user-owned row, then rebuild the fixture user: a test must not
    // inherit rows (or a session) from its predecessors.
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
    vi.unstubAllEnvs();
    resetConfig();
  }, SUITE_HOOK_TIMEOUT_MS);

  return {
    getContext: () => context,
  };
}
