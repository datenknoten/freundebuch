import type pg from 'pg';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';
import { resetConfig } from '../../src/utils/config.js';
import { completeTestUserOnboarding, setupAuthTests, teardownAuthTests } from './auth.helpers.js';
import {
  authHeaders,
  cleanupFriends,
  createAuthenticatedUser,
  createTestFriend,
  type FriendsTestContext,
} from './friends.helpers.js';

// Re-export common helpers
export { authHeaders, createTestFriend };

export interface SearchTestContext extends FriendsTestContext {
  testUser: {
    externalId: string;
    email: string;
    accessToken: string;
  };
}

/**
 * Create a friend with organization and job title
 */
export async function createFriendWithOrganization(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  organization: string,
  jobTitle?: string,
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO friends.friends (user_id, display_name, organization, job_title)
     SELECT u.id, $2, $3, $4
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING external_id`,
    [userExternalId, displayName, organization, jobTitle ?? null],
  );

  return result.rows[0].external_id;
}

/**
 * Create a friend with email address
 */
export async function createFriendWithEmail(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  emailAddress: string,
): Promise<string> {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  // Get internal ID for friend
  const friendResult = await pool.query('SELECT id FROM friends.friends WHERE external_id = $1', [
    friendId,
  ]);

  await pool.query(
    `INSERT INTO friends.friend_emails (friend_id, email_address, email_type, is_primary)
     VALUES ($1, $2, 'personal', true)`,
    [friendResult.rows[0].id, emailAddress],
  );

  return friendId;
}

/**
 * Create a friend with phone number
 */
export async function createFriendWithPhone(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  phoneNumber: string,
): Promise<string> {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  const friendResult = await pool.query('SELECT id FROM friends.friends WHERE external_id = $1', [
    friendId,
  ]);

  await pool.query(
    `INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
     VALUES ($1, $2, 'mobile', true)`,
    [friendResult.rows[0].id, phoneNumber],
  );

  return friendId;
}

/**
 * Create a friend with notes (via relationships)
 * Creates the friend plus a dummy related friend to satisfy the relationship table constraint
 */
export async function createFriendWithNotes(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  notes: string,
): Promise<string> {
  // Create main friend
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  // Create a dummy related friend for the relationship
  const relatedFriendId = await createTestFriend(pool, userExternalId, `Related to ${displayName}`);

  const friendResult = await pool.query('SELECT id FROM friends.friends WHERE external_id = $1', [
    friendId,
  ]);

  const relatedFriendResult = await pool.query(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [relatedFriendId],
  );

  // Use an existing relationship type (friend is a built-in type)
  await pool.query(
    `INSERT INTO friends.friend_relationships (friend_id, related_friend_id, relationship_type_id, notes)
     VALUES ($1, $2, 'friend', $3)`,
    [friendResult.rows[0].id, relatedFriendResult.rows[0].id, notes],
  );

  return friendId;
}

/**
 * Create a friend with met context
 */
export async function createFriendWithMetContext(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  metContext: string,
): Promise<string> {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  const friendResult = await pool.query('SELECT id FROM friends.friends WHERE external_id = $1', [
    friendId,
  ]);

  await pool.query(
    `INSERT INTO friends.friend_met_info (friend_id, met_context, met_date)
     VALUES ($1, $2, CURRENT_DATE)`,
    [friendResult.rows[0].id, metContext],
  );

  return friendId;
}

/**
 * Create a friend with address (city and country)
 */
export async function createFriendWithAddress(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  city: string,
  country: string,
): Promise<string> {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  const friendResult = await pool.query('SELECT id FROM friends.friends WHERE external_id = $1', [
    friendId,
  ]);

  await pool.query(
    `INSERT INTO friends.friend_addresses (friend_id, city, country, address_type, is_primary)
     VALUES ($1, $2, $3, 'home', true)`,
    [friendResult.rows[0].id, city, country],
  );

  return friendId;
}

/**
 * Create a circle and assign a friend to it
 */
export async function createCircleWithFriend(
  pool: pg.Pool,
  userExternalId: string,
  circleName: string,
  friendExternalId: string,
): Promise<string> {
  // Get user ID
  const userResult = await pool.query('SELECT id FROM auth.users WHERE external_id = $1', [
    userExternalId,
  ]);

  // Create circle
  const circleResult = await pool.query(
    `INSERT INTO friends.circles (user_id, name, color)
     VALUES ($1, $2, '#3b82f6')
     RETURNING external_id, id`,
    [userResult.rows[0].id, circleName],
  );

  // Get friend internal ID
  const friendResult = await pool.query('SELECT id FROM friends.friends WHERE external_id = $1', [
    friendExternalId,
  ]);

  // Assign friend to circle
  await pool.query(
    `INSERT INTO friends.friend_circles (friend_id, circle_id)
     VALUES ($1, $2)`,
    [friendResult.rows[0].id, circleResult.rows[0].id],
  );

  return circleResult.rows[0].external_id;
}

/**
 * Create a friend with first and last name (for search vector)
 */
export async function createFriendWithFullName(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  firstName: string,
  lastName: string,
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO friends.friends (user_id, display_name, name_first, name_last)
     SELECT u.id, $2, $3, $4
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING external_id`,
    [userExternalId, displayName, firstName, lastName],
  );

  return result.rows[0].external_id;
}

/**
 * Create a friend with work notes
 */
export async function createFriendWithWorkNotes(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  workNotes: string,
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO friends.friends (user_id, display_name, work_notes)
     SELECT u.id, $2, $3
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING external_id`,
    [userExternalId, displayName, workNotes],
  );

  return result.rows[0].external_id;
}

/**
 * Clean up search history between tests
 */
export async function cleanupSearchHistory(pool: pg.Pool): Promise<void> {
  await pool.query('DELETE FROM friends.search_history');
}

/**
 * Clean up circles between tests
 */
export async function cleanupCircles(pool: pg.Pool): Promise<void> {
  await pool.query('DELETE FROM friends.friend_circles');
  await pool.query('DELETE FROM friends.circles');
}

/**
 * Clean up relationships created during tests
 */
export async function cleanupRelationships(pool: pg.Pool): Promise<void> {
  await pool.query('DELETE FROM friends.friend_relationships');
  // Don't delete the seeded relationship_types - just the relationships
}

/**
 * Setup function for beforeAll in search test files
 */
export function setupSearchTestSuite() {
  let context: SearchTestContext;

  beforeAll(async () => {
    // Set required environment variables for tests
    process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-1';
    process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-1';
    process.env.JWT_EXPIRY = '604800';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.LOG_LEVEL = 'silent';

    const authContext = await setupAuthTests();

    // Create a test user for search tests
    const testUser = await createAuthenticatedUser(
      authContext.pool,
      'search-test@example.com',
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
    // Clean up test data before each test
    if (context?.pool) {
      await cleanupSearchHistory(context.pool);
      await cleanupCircles(context.pool);
      await cleanupRelationships(context.pool);
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
