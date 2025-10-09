import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { generateSessionToken, hashSessionToken } from '../../src/utils/auth.js';
import { countUserSessions, createTestSession, setupAuthTestSuite } from './auth.helpers.js';

describe('Auth Endpoints - Edge Cases & Integration', () => {
  const { getContext } = setupAuthTestSuite();

  describe('Complete User Journey', () => {
    it('should handle complete user lifecycle: register → login → logout → login again', async () => {
      const { app, pool } = getContext();

      const email = 'lifecycle@example.com';
      const password = 'SecurePassword123';

      // Step 1: Register
      const registerResponse = await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      expect(registerResponse.status).toBe(201);
      const registerBody: any = await registerResponse.json();
      const session1Token = registerBody.sessionToken;

      // Step 2: Login (creates second session)
      const loginResponse = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      expect(loginResponse.status).toBe(200);
      const loginBody: any = await loginResponse.json();
      const session2Token = loginBody.sessionToken;

      // Should have 2 sessions
      let sessionCount = await countUserSessions(pool, registerBody.user.externalId);
      expect(sessionCount).toBe(2);

      // Step 3: Logout first session
      const logoutResponse = await app.fetch(
        new Request('http://localhost/api/auth/logout', {
          method: 'POST',
          headers: { Cookie: `session_token=${session1Token}` },
        }),
      );

      expect(logoutResponse.status).toBe(200);

      // Should have 1 session remaining
      sessionCount = await countUserSessions(pool, registerBody.user.externalId);
      expect(sessionCount).toBe(1);

      // Step 4: Login again (creates third session)
      const login2Response = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      expect(login2Response.status).toBe(200);

      // Should have 2 sessions again
      sessionCount = await countUserSessions(pool, registerBody.user.externalId);
      expect(sessionCount).toBe(2);

      // Step 5: Logout all by logging out remaining sessions
      await app.fetch(
        new Request('http://localhost/api/auth/logout', {
          method: 'POST',
          headers: { Cookie: `session_token=${session2Token}` },
        }),
      );

      const login2Body: any = await login2Response.json();
      await app.fetch(
        new Request('http://localhost/api/auth/logout', {
          method: 'POST',
          headers: { Cookie: `session_token=${login2Body.sessionToken}` },
        }),
      );

      // Should have 0 sessions
      sessionCount = await countUserSessions(pool, registerBody.user.externalId);
      expect(sessionCount).toBe(0);
    });

    it('should handle register → password reset → login with new password → logout', async () => {
      const { app } = getContext();

      const email = 'resetjourney@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Register
      const registerResponse = await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: oldPassword }),
        }),
      );

      expect(registerResponse.status).toBe(201);

      // Request password reset
      const forgotResponse = await app.fetch(
        new Request('http://localhost/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
      );

      const forgotBody: any = await forgotResponse.json();

      // Reset password
      const resetResponse = await app.fetch(
        new Request('http://localhost/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: forgotBody.resetToken,
            password: newPassword,
          }),
        }),
      );

      expect(resetResponse.status).toBe(200);

      // Login with new password
      const loginResponse = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: newPassword }),
        }),
      );

      expect(loginResponse.status).toBe(200);
      const loginBody: any = await loginResponse.json();

      // Logout
      const logoutResponse = await app.fetch(
        new Request('http://localhost/api/auth/logout', {
          method: 'POST',
          headers: { Cookie: `session_token=${loginBody.sessionToken}` },
        }),
      );

      expect(logoutResponse.status).toBe(200);
    });
  });

  describe('Multi-Device Scenarios', () => {
    it('should support user logged in on multiple devices simultaneously', async () => {
      const { app, pool } = getContext();

      const email = 'multidevice@example.com';
      const password = 'SecurePassword123';

      // Register
      await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      // Login from device 1
      const device1Response = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      const device1Body: any = await device1Response.json();
      const device1Token = device1Body.sessionToken;

      // Login from device 2
      const device2Response = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      const device2Body: any = await device2Response.json();
      const device2Token = device2Body.sessionToken;

      // Login from device 3
      const device3Response = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      const device3Body: any = await device3Response.json();

      // All should have different session tokens
      expect(device1Token).not.toBe(device2Token);
      expect(device2Token).not.toBe(device3Body.sessionToken);
      expect(device1Token).not.toBe(device3Body.sessionToken);

      // Should have 4 sessions (1 from register + 3 from logins)
      const sessionCount = await countUserSessions(pool, device1Body.user.externalId);
      expect(sessionCount).toBe(4);

      // Refresh from device 1 should work
      const refresh1Response = await app.fetch(
        new Request('http://localhost/api/auth/refresh', {
          method: 'POST',
          headers: { Cookie: `session_token=${device1Token}` },
        }),
      );

      expect(refresh1Response.status).toBe(200);

      // Refresh from device 2 should work
      const refresh2Response = await app.fetch(
        new Request('http://localhost/api/auth/refresh', {
          method: 'POST',
          headers: { Cookie: `session_token=${device2Token}` },
        }),
      );

      expect(refresh2Response.status).toBe(200);

      // Logout from device 1
      await app.fetch(
        new Request('http://localhost/api/auth/logout', {
          method: 'POST',
          headers: { Cookie: `session_token=${device1Token}` },
        }),
      );

      // Device 2 should still work
      const refresh2AfterLogout = await app.fetch(
        new Request('http://localhost/api/auth/refresh', {
          method: 'POST',
          headers: { Cookie: `session_token=${device2Token}` },
        }),
      );

      expect(refresh2AfterLogout.status).toBe(200);

      // Device 1 should not work
      const refresh1AfterLogout = await app.fetch(
        new Request('http://localhost/api/auth/refresh', {
          method: 'POST',
          headers: { Cookie: `session_token=${device1Token}` },
        }),
      );

      expect(refresh1AfterLogout.status).toBe(401);
    });
  });

  describe('Token Expiration & Cleanup', () => {
    it('should reject expired session tokens', async () => {
      const { app, pool } = getContext();

      const email = 'expiredsession@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerResponse = await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      const registerBody: any = await registerResponse.json();
      const sessionToken = registerBody.sessionToken;

      // Manually expire the session
      const tokenHash = hashSessionToken(sessionToken);
      await pool.query(
        "UPDATE auth.sessions SET expires_at = NOW() - INTERVAL '1 day' WHERE token_hash = $1",
        [tokenHash],
      );

      // Try to refresh with expired session
      const refreshResponse = await app.fetch(
        new Request('http://localhost/api/auth/refresh', {
          method: 'POST',
          headers: { Cookie: `session_token=${sessionToken}` },
        }),
      );

      expect(refreshResponse.status).toBe(401);

      const body: any = await refreshResponse.json();
      expect(body.error).toBe('Invalid or expired session');
    });

    it('should handle concurrent refresh requests with same session token', async () => {
      const { app } = getContext();

      const email = 'concurrent@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerResponse = await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      const registerBody: any = await registerResponse.json();
      const sessionToken = registerBody.sessionToken;

      // Make 5 concurrent refresh requests
      const refreshPromises = Array.from({ length: 5 }, () =>
        app.fetch(
          new Request('http://localhost/api/auth/refresh', {
            method: 'POST',
            headers: { Cookie: `session_token=${sessionToken}` },
          }),
        ),
      );

      const responses = await Promise.all(refreshPromises);

      // All should succeed (session token doesn't rotate on refresh)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // All should return new access tokens
      const bodies: any[] = await Promise.all(responses.map((r) => r.json()));
      const accessTokens = bodies.map((b) => b.accessToken);

      // All access tokens should be valid
      accessTokens.forEach((token) => {
        expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      });
    });
  });

  describe('Database Constraint Tests', () => {
    it('should enforce unique email constraint at database level', async () => {
      const { pool } = getContext();

      const email = 'unique@example.com';
      const passwordHash = await bcrypt.hash('SecurePassword123', 10);

      // Insert user
      await pool.query('INSERT INTO auth.users (email, password_hash) VALUES ($1, $2)', [
        email,
        passwordHash,
      ]);

      // Try to insert duplicate email
      await expect(
        pool.query('INSERT INTO auth.users (email, password_hash) VALUES ($1, $2)', [
          email,
          passwordHash,
        ]),
      ).rejects.toThrow();
    });

    it('should enforce unique session token constraint', async () => {
      const { pool } = getContext();

      const email = 'sessionunique@example.com';
      const passwordHash = await bcrypt.hash('SecurePassword123', 10);

      // Create user
      const userResult = await pool.query(
        'INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING id, external_id',
        [email, passwordHash],
      );

      const userId = userResult.rows[0].id;
      const userExternalId = userResult.rows[0].external_id;

      // Create session
      const sessionToken = generateSessionToken();
      const tokenHash = hashSessionToken(sessionToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await createTestSession(pool, userExternalId, tokenHash, expiresAt);

      // Try to create duplicate session with same token
      await expect(
        pool.query(
          'INSERT INTO auth.sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
          [userId, tokenHash, expiresAt],
        ),
      ).rejects.toThrow();
    });

    it('should cascade delete sessions when user is deleted', async () => {
      const { app, pool } = getContext();

      const email = 'cascadedelete@example.com';
      const password = 'SecurePassword123';

      // Register (creates user and session)
      const registerResponse = await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      const registerBody: any = await registerResponse.json();
      const userExternalId = registerBody.user.externalId;

      // Create additional session
      await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      // Verify user has sessions
      let sessionCount = await countUserSessions(pool, userExternalId);
      expect(sessionCount).toBeGreaterThan(0);

      // Delete user
      await pool.query('DELETE FROM auth.users WHERE external_id = $1', [userExternalId]);

      // Verify sessions were cascade deleted
      sessionCount = await countUserSessions(pool, userExternalId);
      expect(sessionCount).toBe(0);
    });

    it('should cascade delete password reset tokens when user is deleted', async () => {
      const { app, pool } = getContext();

      const email = 'cascadereset@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerResponse = await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      const registerBody: any = await registerResponse.json();
      const userExternalId = registerBody.user.externalId;

      // Request password reset
      await app.fetch(
        new Request('http://localhost/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
      );

      // Get user ID
      const userResult = await pool.query('SELECT id FROM auth.users WHERE external_id = $1', [
        userExternalId,
      ]);
      const userId = userResult.rows[0].id;

      // Verify reset token exists
      let tokenResult = await pool.query(
        'SELECT COUNT(*) FROM auth.password_reset_tokens WHERE user_id = $1',
        [userId],
      );
      expect(parseInt(tokenResult.rows[0].count, 10)).toBeGreaterThan(0);

      // Delete user
      await pool.query('DELETE FROM auth.users WHERE external_id = $1', [userExternalId]);

      // Verify reset tokens were cascade deleted
      tokenResult = await pool.query(
        'SELECT COUNT(*) FROM auth.password_reset_tokens WHERE user_id = $1',
        [userId],
      );
      expect(parseInt(tokenResult.rows[0].count, 10)).toBe(0);
    });
  });

  describe('Boundary & Special Values', () => {
    it('should handle very long email addresses', async () => {
      const { app } = getContext();

      // Email with 254 characters (max valid length)
      const longEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.com`;

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: longEmail,
          password: 'SecurePassword123',
        }),
      });

      const response = await app.fetch(request);

      // Should either accept or reject gracefully
      expect([201, 400]).toContain(response.status);
    });

    it('should handle password with exactly 8 characters (minimum)', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'minpwd@example.com',
          password: 'Ee123456',
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(201);
    });

    it('should handle password with special characters', async () => {
      const { app } = getContext();

      const specialPasswords = [
        'P@ssw0rd!#$%',
        'Pass!@#$%^&*()',
        'Pässwörd123',
        'パスワード123abc',
        'P@ss\nw0rd', // with newline
      ];

      for (const password of specialPasswords) {
        const request = new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `special-${Math.random()}@example.com`,
            password,
          }),
        });

        const response = await app.fetch(request);

        // Should handle special characters
        expect([201, 400]).toContain(response.status);
      }
    });

    it('should handle very long passwords', async () => {
      const { app } = getContext();

      // bcrypt has max length of 72 bytes
      const longPassword = 'a'.repeat(100);

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'longpwd@example.com',
          password: longPassword,
        }),
      });

      const response = await app.fetch(request);

      // Should either accept or reject gracefully
      expect([201, 400]).toContain(response.status);
    });

    it('should handle email with plus addressing (RFC 5233)', async () => {
      const { app } = getContext();

      const email = 'user+test@example.com';

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'SecurePassword123',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body.user.email).toBe(email);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent registration attempts with same email', async () => {
      const { app } = getContext();

      const email = 'concurrent-register@example.com';
      const password = 'SecurePassword123';

      // Make 5 concurrent registration requests
      const requests = Array.from({ length: 5 }, () =>
        app.fetch(
          new Request('http://localhost/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          }),
        ),
      );

      const responses = await Promise.all(requests);

      // Exactly one should succeed (201), others should fail (409)
      const successCount = responses.filter((r) => r.status === 201).length;
      const conflictCount = responses.filter((r) => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(4);
    });

    it('should handle concurrent login attempts', async () => {
      const { app } = getContext();

      const email = 'concurrent-login@example.com';
      const password = 'SecurePassword123';

      // Register
      await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );

      // Make 10 concurrent login requests
      const requests = Array.from({ length: 10 }, () =>
        app.fetch(
          new Request('http://localhost/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          }),
        ),
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // All should have unique session tokens
      const bodies: any[] = await Promise.all(responses.map((r) => r.json()));
      const sessionTokens = bodies.map((b) => b.sessionToken);
      const uniqueTokens = new Set(sessionTokens);

      expect(uniqueTokens.size).toBe(10);
    });
  });
});
