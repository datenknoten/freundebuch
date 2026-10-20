import type pg from 'pg';
import { afterAll, assert, beforeAll, beforeEach } from 'vitest';

import {
  type AuthTestContext,
  completeTestUserOnboarding,
  firstRow,
  setupAuthTests,
  teardownAuthTests,
  truncateUserData,
} from './auth.helpers.js';
import {
  authHeaders,
  createAuthenticatedUser,
  createTestFriend,
  type FriendsTestContext,
} from './friends.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

// Re-export common helpers
export { authHeaders, createTestFriend };

export interface SearchTestContext extends FriendsTestContext {
  testUser: {
    externalId: string;
    email: string;
    sessionCookies: string;
  };
}

/**
 * Create a friend with organization and job title (in professional history)
 */
export async function createFriendWithOrganization(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  organization: string,
  jobTitle?: string,
) {
  // Create the friend
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  // Get internal ID for friend
  const friendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [friendId],
  );

  // Add professional history entry with organization
  await pool.query(
    `INSERT INTO friends.friend_professional_history (friend_id, organization, job_title, from_month, from_year, is_primary)
     VALUES ($1, $2, $3, 1, 2024, true)`,
    [firstRow(friendResult).id, organization, jobTitle ?? null],
  );

  return friendId;
}

/**
 * Create a friend with email address
 */
export async function createFriendWithEmail(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  emailAddress: string,
) {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  // Get internal ID for friend
  const friendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [friendId],
  );

  await pool.query(
    `INSERT INTO friends.friend_emails (friend_id, email_address, email_type, is_primary)
     VALUES ($1, $2, 'personal', true)`,
    [firstRow(friendResult).id, emailAddress],
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
) {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  const friendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [friendId],
  );

  await pool.query(
    `INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
     VALUES ($1, $2, 'mobile', true)`,
    [firstRow(friendResult).id, phoneNumber],
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
) {
  // Create main friend
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  // Create a dummy related friend for the relationship
  const relatedFriendId = await createTestFriend(pool, userExternalId, `Related to ${displayName}`);

  const friendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [friendId],
  );

  const relatedFriendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [relatedFriendId],
  );

  // Use an existing relationship type (friend is a built-in type)
  await pool.query(
    `INSERT INTO friends.friend_relationships (friend_id, related_friend_id, relationship_type_id, notes)
     VALUES ($1, $2, 'friend', $3)`,
    [firstRow(friendResult).id, firstRow(relatedFriendResult).id, notes],
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
) {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  const friendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [friendId],
  );

  await pool.query(
    `INSERT INTO friends.friend_met_info (friend_id, met_context, met_date)
     VALUES ($1, $2, CURRENT_DATE)`,
    [firstRow(friendResult).id, metContext],
  );

  return friendId;
}

/**
 * Create a friend with a note (friends.friend_notes, Epic 15)
 */
export async function createFriendWithFriendNote(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  content: string,
) {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  await pool.query(
    `INSERT INTO friends.friend_notes (friend_id, content)
     SELECT id, $2 FROM friends.friends WHERE external_id = $1`,
    [friendId, content],
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
) {
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  const friendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [friendId],
  );

  await pool.query(
    `INSERT INTO friends.friend_addresses (friend_id, city, country, address_type, is_primary)
     VALUES ($1, $2, $3, 'home', true)`,
    [firstRow(friendResult).id, city, country],
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
) {
  // Get user ID
  const userResult = await pool.query<{ id: string }>(
    'SELECT id FROM auth.users WHERE external_id = $1',
    [userExternalId],
  );

  // Create circle
  const circleResult = await pool.query<{ id: string; external_id: string }>(
    `INSERT INTO friends.circles (user_id, name, color)
     VALUES ($1, $2, '#3b82f6')
     RETURNING external_id, id`,
    [firstRow(userResult).id, circleName],
  );

  // Get friend internal ID
  const friendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [friendExternalId],
  );

  // Assign friend to circle
  await pool.query(
    `INSERT INTO friends.friend_circles (friend_id, circle_id)
     VALUES ($1, $2)`,
    [firstRow(friendResult).id, firstRow(circleResult).id],
  );

  return firstRow(circleResult).external_id;
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
) {
  const result = await pool.query<{ external_id: string }>(
    `INSERT INTO friends.friends (user_id, display_name, name_first, name_last)
     SELECT u.id, $2, $3, $4
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING external_id`,
    [userExternalId, displayName, firstName, lastName],
  );

  return firstRow(result).external_id;
}

/**
 * Create a friend with work notes (in professional history as notes)
 */
export async function createFriendWithWorkNotes(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  workNotes: string,
) {
  // Create the friend
  const friendId = await createTestFriend(pool, userExternalId, displayName);

  // Get internal ID for friend
  const friendResult = await pool.query<{ id: string }>(
    'SELECT id FROM friends.friends WHERE external_id = $1',
    [friendId],
  );

  // Add professional history entry with notes
  await pool.query(
    `INSERT INTO friends.friend_professional_history (friend_id, notes, from_month, from_year, is_primary)
     VALUES ($1, $2, 1, 2024, true)`,
    [firstRow(friendResult).id, workNotes],
  );

  return friendId;
}

/**
 * Setup function for beforeAll in search test files
 */
export function setupSearchTestSuite() {
  let authContext: AuthTestContext | undefined;
  let context: SearchTestContext | undefined;

  beforeAll(async () => {
    authContext = await setupAuthTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    // Wipe every user-owned row, then rebuild the fixture user: search
    // assertions count results, so an inherited friend silently breaks them.
    assert.isDefined(authContext, 'the suite context is set in beforeAll');
    await truncateUserData(authContext.pool);
    const testUser = await createAuthenticatedUser(
      authContext.pool,
      'search-test@example.com',
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
