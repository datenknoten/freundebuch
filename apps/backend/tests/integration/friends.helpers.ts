import type pg from 'pg';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';
import { generateToken, hashPassword } from '../../src/utils/auth.js';
import { resetConfig } from '../../src/utils/config.js';
import {
  type AuthTestContext,
  completeTestUserOnboarding,
  createTestUser,
  setupAuthTests,
  teardownAuthTests,
} from './auth.helpers.js';

export interface FriendsTestContext extends AuthTestContext {
  testUser: {
    externalId: string;
    email: string;
    accessToken: string;
  };
}

/**
 * Create a test user and return with access token for authentication
 */
export async function createAuthenticatedUser(
  pool: pg.Pool,
  email: string,
  password: string,
): Promise<{ externalId: string; email: string; accessToken: string }> {
  const passwordHash = await hashPassword(password);
  const user = await createTestUser(pool, email, passwordHash);
  const accessToken = generateToken({ userId: user.externalId, email: user.email });

  return {
    externalId: user.externalId,
    email: user.email,
    accessToken,
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
 * Helper to make authenticated request
 */
export function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Clean up friends between tests (preserves self-profiles used for onboarding)
 */
export async function cleanupFriends(pool: pg.Pool): Promise<void> {
  // Delete sub-resources for non-self-profile friends only
  await pool.query(`
    DELETE FROM friends.friend_urls
    WHERE friend_id IN (
      SELECT c.id FROM friends.friends c
      LEFT JOIN auth.users u ON u.self_profile_id = c.id
      WHERE u.self_profile_id IS NULL
    )
  `);
  await pool.query(`
    DELETE FROM friends.friend_addresses
    WHERE friend_id IN (
      SELECT c.id FROM friends.friends c
      LEFT JOIN auth.users u ON u.self_profile_id = c.id
      WHERE u.self_profile_id IS NULL
    )
  `);
  await pool.query(`
    DELETE FROM friends.friend_emails
    WHERE friend_id IN (
      SELECT c.id FROM friends.friends c
      LEFT JOIN auth.users u ON u.self_profile_id = c.id
      WHERE u.self_profile_id IS NULL
    )
  `);
  await pool.query(`
    DELETE FROM friends.friend_phones
    WHERE friend_id IN (
      SELECT c.id FROM friends.friends c
      LEFT JOIN auth.users u ON u.self_profile_id = c.id
      WHERE u.self_profile_id IS NULL
    )
  `);
  // Delete friends that are NOT self-profiles
  await pool.query(`
    DELETE FROM friends.friends c
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.self_profile_id = c.id
    )
  `);
}

/**
 * Setup function for beforeAll in friends test files
 */
export function setupFriendsTestSuite() {
  let context: FriendsTestContext;

  beforeAll(async () => {
    // Set required environment variables for tests
    process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-1';
    process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-1';
    process.env.JWT_EXPIRY = '604800';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.LOG_LEVEL = 'silent';

    const authContext = await setupAuthTests();

    // Create a test user for friend tests
    const testUser = await createAuthenticatedUser(
      authContext.pool,
      'friends-test@example.com',
      'SecurePassword123',
    );

    // Complete onboarding for the test user (required by onboarding middleware)
    await completeTestUserOnboarding(authContext.pool, testUser.externalId);

    context = {
      ...authContext,
      testUser,
    };
  }, 120000);

  beforeEach(async () => {
    resetRateLimiters();
    // Clean up friends before each test
    if (context?.pool) {
      await cleanupFriends(context.pool);
    }
  });

  afterAll(async () => {
    await teardownAuthTests(context);
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.JWT_EXPIRY;
    delete process.env.FRONTEND_URL;
    delete process.env.DATABASE_URL;
    delete process.env.LOG_LEVEL;
    resetConfig();
  }, 120000);

  return {
    getContext: () => context,
  };
}
