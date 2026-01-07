import type pg from 'pg';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';
import { generateToken, hashPassword } from '../../src/utils/auth.js';
import { resetConfig } from '../../src/utils/config.js';
import {
  type AuthTestContext,
  createTestUser,
  setupAuthTests,
  teardownAuthTests,
} from './auth.helpers.js';

export interface ContactsTestContext extends AuthTestContext {
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
 * Helper to create a contact directly in the database
 */
export async function createTestContact(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO contacts.contacts (user_id, display_name)
     SELECT u.id, $2
     FROM auth.users u
     WHERE u.external_id = $1
     RETURNING external_id`,
    [userExternalId, displayName],
  );

  return result.rows[0].external_id;
}

/**
 * Helper to get contact from database
 */
export async function getTestContact(
  pool: pg.Pool,
  contactExternalId: string,
): Promise<{ displayName: string; deletedAt: Date | null } | null> {
  const result = await pool.query(
    'SELECT display_name, deleted_at FROM contacts.contacts WHERE external_id = $1',
    [contactExternalId],
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
 * Helper to count contacts for a user
 */
export async function countUserContacts(pool: pg.Pool, userExternalId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) FROM contacts.contacts c
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
 * Clean up contacts between tests
 */
export async function cleanupContacts(pool: pg.Pool): Promise<void> {
  await pool.query('DELETE FROM contacts.contact_urls');
  await pool.query('DELETE FROM contacts.contact_addresses');
  await pool.query('DELETE FROM contacts.contact_emails');
  await pool.query('DELETE FROM contacts.contact_phones');
  await pool.query('DELETE FROM contacts.contacts');
}

/**
 * Setup function for beforeAll in contacts test files
 */
export function setupContactsTestSuite() {
  let context: ContactsTestContext;

  beforeAll(async () => {
    // Set required environment variables for tests
    process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-1';
    process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-1';
    process.env.JWT_EXPIRY = '604800';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.LOG_LEVEL = 'silent';

    const authContext = await setupAuthTests();

    // Create a test user for contact tests
    const testUser = await createAuthenticatedUser(
      authContext.pool,
      'contacts-test@example.com',
      'SecurePassword123',
    );

    context = {
      ...authContext,
      testUser,
    };
  }, 120000);

  beforeEach(async () => {
    resetRateLimiters();
    // Clean up contacts before each test
    if (context?.pool) {
      await cleanupContacts(context.pool);
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
