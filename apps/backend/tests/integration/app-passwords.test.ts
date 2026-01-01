import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { createTestUser, setupAuthTestSuite } from './auth.helpers.js';

describe('App Passwords API - Integration Tests', { timeout: 30000 }, () => {
  const { getContext } = setupAuthTestSuite();

  /**
   * Helper to get auth tokens for a test user
   */
  async function getAuthTokens(email: string, password: string) {
    const { app } = getContext();

    const response = await app.fetch(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    );

    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const body: any = await response.json();
    return {
      accessToken: body.accessToken,
      sessionToken: body.sessionToken,
    };
  }

  /**
   * Helper to create a test user and get auth tokens
   */
  async function createUserAndLogin(email: string, password: string) {
    const { pool } = getContext();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createTestUser(pool, email, passwordHash);
    const tokens = await getAuthTokens(email, password);
    return { user, tokens };
  }

  describe('GET /api/app-passwords', () => {
    it('should return 401 when not authenticated', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'GET',
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should return empty array when no passwords exist', async () => {
      const { app } = getContext();
      const { tokens } = await createUserAndLogin('apppw-empty@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body).toEqual([]);
    });

    it('should return list of app passwords', async () => {
      const { app } = getContext();
      const { tokens } = await createUserAndLogin('apppw-list@test.com', 'TestPassword123');

      // Create a password first
      await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({ name: 'Test iPhone' }),
        }),
      );

      // Now list
      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      const passwords = (await response.json()) as any[];
      expect(passwords).toHaveLength(1);
      expect(passwords[0]).toHaveProperty('externalId');
      expect(passwords[0]).toHaveProperty('name', 'Test iPhone');
      expect(passwords[0]).toHaveProperty('passwordPrefix');
      expect(passwords[0]).toHaveProperty('createdAt');
      // Password hash should NOT be returned
      expect(passwords[0]).not.toHaveProperty('password');
      expect(passwords[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /api/app-passwords', () => {
    it('should return 401 when not authenticated', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test' }),
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should create an app password and return it with the secret', async () => {
      const { app } = getContext();
      const { tokens } = await createUserAndLogin('apppw-create@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({ name: 'My Thunderbird' }),
        }),
      );

      expect(response.status).toBe(201);
      const body: any = await response.json();
      expect(body).toHaveProperty('externalId');
      expect(body).toHaveProperty('name', 'My Thunderbird');
      expect(body).toHaveProperty('password');
      expect(body).toHaveProperty('passwordPrefix');
      expect(body).toHaveProperty('createdAt');

      // Password should be formatted with dashes (xxxx-xxxx-xxxx-...)
      expect(body.password).toMatch(/^[a-zA-Z0-9_-]{4}-[a-zA-Z0-9_-]{4}-/);

      // Prefix should be 8 characters of valid base64url characters
      // Note: base64url includes a-zA-Z0-9_- so the prefix may contain dashes
      expect(body.passwordPrefix).toMatch(/^[a-zA-Z0-9_-]{8}$/);
    });

    it('should return 400 for missing name', async () => {
      const { app } = getContext();
      const { tokens } = await createUserAndLogin('apppw-noname@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({}),
        }),
      );

      expect(response.status).toBe(400);
    });

    it('should return 429 when max passwords limit reached', async () => {
      const { app } = getContext();
      const { tokens } = await createUserAndLogin('apppw-limit@test.com', 'TestPassword123');

      // Create 20 passwords (the max limit)
      for (let i = 0; i < 20; i++) {
        await app.fetch(
          new Request('http://localhost/api/app-passwords', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokens.accessToken}`,
            },
            body: JSON.stringify({ name: `Password ${i + 1}` }),
          }),
        );
      }

      // Try to create one more - should fail
      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({ name: 'One Too Many' }),
        }),
      );

      expect(response.status).toBe(429);
      const body: any = await response.json();
      expect(body.error).toContain('Maximum');
    });
  });

  describe('DELETE /api/app-passwords/:id', () => {
    it('should return 401 when not authenticated', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords/some-uuid', {
          method: 'DELETE',
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should revoke an app password', async () => {
      const { app } = getContext();
      const { tokens } = await createUserAndLogin('apppw-revoke@test.com', 'TestPassword123');

      // Create a password first
      const createResponse = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({ name: 'To Be Revoked' }),
        }),
      );

      const created: any = await createResponse.json();

      // Delete it
      const response = await app.fetch(
        new Request(`http://localhost/api/app-passwords/${created.externalId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);

      // Verify it's no longer listed
      const listResponse = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      const list = (await listResponse.json()) as any[];
      expect(list).toHaveLength(0);
    });

    it('should return 404 for non-existent password', async () => {
      const { app } = getContext();
      const { tokens } = await createUserAndLogin('apppw-404@test.com', 'TestPassword123');

      // Use a valid UUID v4 format that doesn't exist in the database
      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords/00000000-0000-4000-8000-000000000000', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const { app } = getContext();
      const { tokens } = await createUserAndLogin('apppw-invalid-uuid@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request('http://localhost/api/app-passwords/not-a-valid-uuid', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      expect(response.status).toBe(400);
    });

    it('should not allow revoking another user password', async () => {
      const { app } = getContext();

      // Create user 1 and their password
      const { tokens: tokens1 } = await createUserAndLogin(
        'apppw-user1@test.com',
        'TestPassword123',
      );
      const createResponse = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens1.accessToken}`,
          },
          body: JSON.stringify({ name: 'User1 Password' }),
        }),
      );
      const created: any = await createResponse.json();

      // Create user 2
      const { tokens: tokens2 } = await createUserAndLogin(
        'apppw-user2@test.com',
        'TestPassword123',
      );

      // User 2 tries to delete User 1's password
      const response = await app.fetch(
        new Request(`http://localhost/api/app-passwords/${created.externalId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${tokens2.accessToken}`,
          },
        }),
      );

      expect(response.status).toBe(404);
    });
  });

  describe('App password verification flow', () => {
    it('should work end-to-end: create, list, verify, revoke', async () => {
      const { app, pool } = getContext();
      const testEmail = 'apppw-e2e@test.com';
      const testPassword = 'TestPassword123';
      const { tokens } = await createUserAndLogin(testEmail, testPassword);

      // 1. Create an app password
      const createResponse = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({ name: 'E2E Test' }),
        }),
      );

      expect(createResponse.status).toBe(201);
      const created: any = await createResponse.json();

      // 2. Verify the password is listed
      const listResponse = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      const list = (await listResponse.json()) as any[];
      expect(list).toHaveLength(1);
      expect(list[0].externalId).toBe(created.externalId);

      // 3. Verify the password was stored in database
      const dbResult = await pool.query(
        'SELECT password_hash, password_prefix FROM auth.app_passwords WHERE external_id = $1',
        [created.externalId],
      );
      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].password_hash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format
      expect(dbResult.rows[0].password_prefix).toBe(created.passwordPrefix);

      // 4. Revoke the password
      const revokeResponse = await app.fetch(
        new Request(`http://localhost/api/app-passwords/${created.externalId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      expect(revokeResponse.status).toBe(200);

      // 5. Verify it's no longer listed
      const finalListResponse = await app.fetch(
        new Request('http://localhost/api/app-passwords', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      const finalList = (await finalListResponse.json()) as any[];
      expect(finalList).toHaveLength(0);

      // 6. Verify the password is soft-deleted (revoked_at is set)
      const finalDbResult = await pool.query(
        'SELECT revoked_at FROM auth.app_passwords WHERE external_id = $1',
        [created.externalId],
      );
      expect(finalDbResult.rows[0].revoked_at).not.toBeNull();
    });
  });
});
