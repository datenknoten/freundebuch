import { describe, expect, it } from 'vitest';
import { extractCookies, extractSessionToken, setupAuthTestSuite } from './auth.helpers.js';

/**
 * Helper to sign up a new user via Better Auth and return cookies + response body.
 */
async function signUp(
  app: { fetch: (req: Request) => Response | Promise<Response> },
  email: string,
  password: string,
  name?: string,
) {
  const response = await app.fetch(
    new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: name ?? email.split('@')[0] }),
    }),
  );

  const body: any = await response.json();
  const cookies = extractCookies(response);

  return { response, body, cookies };
}

/**
 * Helper to sign in via Better Auth and return cookies + response body.
 */
async function signIn(
  app: { fetch: (req: Request) => Response | Promise<Response> },
  email: string,
  password: string,
) {
  const response = await app.fetch(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  );

  const body: any = await response.json();
  const cookies = extractCookies(response);

  return { response, body, cookies };
}

/**
 * Helper to sign out via Better Auth using session cookies.
 */
async function signOut(
  app: { fetch: (req: Request) => Response | Promise<Response> },
  cookies: string,
) {
  const response = await app.fetch(
    new Request('http://localhost/api/auth/sign-out', {
      method: 'POST',
      headers: { Cookie: cookies },
    }),
  );

  return { response };
}

/**
 * Count sessions for a user in the Better Auth session table.
 */
async function countBetterAuthSessions(pool: import('pg').Pool, userId: string): Promise<number> {
  const result = await pool.query('SELECT COUNT(*) FROM auth.session WHERE user_id = $1', [userId]);
  return parseInt(result.rows[0].count, 10);
}

describe('Auth Endpoints - Edge Cases & Integration (Better Auth)', () => {
  const { getContext } = setupAuthTestSuite();

  describe('Complete User Journey', () => {
    it('should handle complete user lifecycle: sign-up -> sign-in -> sign-out -> sign-in again', async () => {
      const { app, pool } = getContext();

      const email = 'lifecycle@example.com';
      const password = 'SecurePassword123';

      // Step 1: Sign up
      const { body: signUpBody, cookies: signUpCookies } = await signUp(app, email, password);

      expect(signUpBody).toHaveProperty('user');
      expect(signUpBody.user).toHaveProperty('id');
      const userId = signUpBody.user.id;

      // Step 2: Sign in (creates second session)
      const { response: signIn1Res, cookies: signIn1Cookies } = await signIn(app, email, password);
      expect(signIn1Res.status).toBe(200);

      // Should have 2 sessions (1 from sign-up + 1 from sign-in)
      let sessionCount = await countBetterAuthSessions(pool, userId);
      expect(sessionCount).toBe(2);

      // Step 3: Sign out the sign-up session
      const { response: signOut1Res } = await signOut(app, signUpCookies);
      expect(signOut1Res.status).toBe(200);

      // Should have 1 session remaining
      sessionCount = await countBetterAuthSessions(pool, userId);
      expect(sessionCount).toBe(1);

      // Step 4: Sign in again (creates third session)
      const { response: signIn2Res, cookies: signIn2Cookies } = await signIn(app, email, password);
      expect(signIn2Res.status).toBe(200);

      // Should have 2 sessions again
      sessionCount = await countBetterAuthSessions(pool, userId);
      expect(sessionCount).toBe(2);

      // Step 5: Sign out all remaining sessions
      await signOut(app, signIn1Cookies);
      await signOut(app, signIn2Cookies);

      // Should have 0 sessions
      sessionCount = await countBetterAuthSessions(pool, userId);
      expect(sessionCount).toBe(0);
    });
  });

  describe('Multi-Device Scenarios', () => {
    it('should support user signed in on multiple devices simultaneously', async () => {
      const { app, pool } = getContext();

      const email = 'multidevice@example.com';
      const password = 'SecurePassword123';

      // Sign up
      const { body: signUpBody } = await signUp(app, email, password);
      const userId = signUpBody.user.id;

      // Sign in from device 1
      const { cookies: device1Cookies } = await signIn(app, email, password);
      const device1Token = extractSessionToken(device1Cookies);

      // Sign in from device 2
      const { cookies: device2Cookies } = await signIn(app, email, password);
      const device2Token = extractSessionToken(device2Cookies);

      // Sign in from device 3
      const { cookies: device3Cookies } = await signIn(app, email, password);
      const device3Token = extractSessionToken(device3Cookies);

      // All should have different session tokens
      expect(device1Token).not.toBe(device2Token);
      expect(device2Token).not.toBe(device3Token);
      expect(device1Token).not.toBe(device3Token);

      // Should have 4 sessions (1 from sign-up + 3 from sign-ins)
      const sessionCount = await countBetterAuthSessions(pool, userId);
      expect(sessionCount).toBe(4);

      // Sign out from device 1
      await signOut(app, device1Cookies);

      // Device 2 should still have a valid session (verify via /api/auth/me)
      const meResponse = await app.fetch(
        new Request('http://localhost/api/auth/me', {
          method: 'GET',
          headers: { Cookie: device2Cookies },
        }),
      );
      expect(meResponse.status).toBe(200);

      // Device 1 session should be invalidated.
      // Strip the session_data cache cookie to simulate browser behavior:
      // sign-out sets Max-Age=0 on session_data, so browsers delete it.
      const device1TokenOnly = device1Cookies
        .split('; ')
        .filter((c) => !c.startsWith('better-auth.session_data='))
        .join('; ');
      const me1Response = await app.fetch(
        new Request('http://localhost/api/auth/me', {
          method: 'GET',
          headers: { Cookie: device1TokenOnly },
        }),
      );
      expect(me1Response.status).toBe(401);
    });
  });

  describe('Session Expiration', () => {
    it('should reject expired session tokens', async () => {
      const { app, pool } = getContext();

      const email = 'expiredsession@example.com';
      const password = 'SecurePassword123';

      // Sign up
      const { body: signUpBody, cookies } = await signUp(app, email, password);
      const userId = signUpBody.user.id;

      // Manually expire the session in the Better Auth session table
      await pool.query(
        `UPDATE auth.session SET expires_at = NOW() - INTERVAL '1 day' WHERE user_id = $1`,
        [userId],
      );

      // Strip the session_data cache cookie so Better Auth checks the DB
      // instead of returning the cached (now-stale) session data
      const sessionTokenOnly = cookies
        .split('; ')
        .filter((c) => !c.startsWith('better-auth.session_data='))
        .join('; ');

      // Try to access a protected route with expired session
      const meResponse = await app.fetch(
        new Request('http://localhost/api/auth/me', {
          method: 'GET',
          headers: { Cookie: sessionTokenOnly },
        }),
      );

      expect(meResponse.status).toBe(401);
    });
  });

  describe('Database Constraint Tests', () => {
    it('should enforce unique email constraint on Better Auth user table', async () => {
      const { pool } = getContext();

      const email = 'unique-ba@example.com';

      // Insert user into Better Auth user table
      await pool.query(
        `INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
         VALUES (gen_random_uuid()::text, 'Test', $1, false, NOW(), NOW())`,
        [email],
      );

      // Try to insert duplicate email
      await expect(
        pool.query(
          `INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
           VALUES (gen_random_uuid()::text, 'Test2', $1, false, NOW(), NOW())`,
          [email],
        ),
      ).rejects.toThrow();
    });

    it('should enforce unique session token constraint', async () => {
      const { pool } = getContext();

      const email = 'sessionunique-ba@example.com';

      // Create user
      const userId = `test-session-unique-${Date.now()}`;
      await pool.query(
        `INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
         VALUES ($1, 'Test', $2, false, NOW(), NOW())`,
        [userId, email],
      );

      const token = `unique-token-test-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create session
      await pool.query(
        `INSERT INTO auth.session (id, token, expires_at, created_at, updated_at, user_id)
         VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), $3)`,
        [token, expiresAt, userId],
      );

      // Try to create duplicate session with same token
      await expect(
        pool.query(
          `INSERT INTO auth.session (id, token, expires_at, created_at, updated_at, user_id)
           VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), $3)`,
          [token, expiresAt, userId],
        ),
      ).rejects.toThrow();
    });

    it('should cascade delete sessions when Better Auth user is deleted', async () => {
      const { app, pool } = getContext();

      const email = 'cascadedelete-ba@example.com';
      const password = 'SecurePassword123';

      // Sign up (creates user and session)
      const { body: signUpBody } = await signUp(app, email, password);
      const userId = signUpBody.user.id;

      // Create additional session via sign-in
      await signIn(app, email, password);

      // Verify user has sessions
      let sessionCount = await countBetterAuthSessions(pool, userId);
      expect(sessionCount).toBeGreaterThan(0);

      // Delete user from Better Auth user table
      await pool.query('DELETE FROM auth."user" WHERE id = $1', [userId]);

      // Verify sessions were cascade deleted
      sessionCount = await countBetterAuthSessions(pool, userId);
      expect(sessionCount).toBe(0);
    });

    it('should cascade delete accounts when Better Auth user is deleted', async () => {
      const { app, pool } = getContext();

      const email = 'cascadeaccount-ba@example.com';
      const password = 'SecurePassword123';

      // Sign up
      const { body: signUpBody } = await signUp(app, email, password);
      const userId = signUpBody.user.id;

      // Verify account exists
      let accountResult = await pool.query('SELECT COUNT(*) FROM auth.account WHERE user_id = $1', [
        userId,
      ]);
      expect(parseInt(accountResult.rows[0].count, 10)).toBeGreaterThan(0);

      // Delete user
      await pool.query('DELETE FROM auth."user" WHERE id = $1', [userId]);

      // Verify accounts were cascade deleted
      accountResult = await pool.query('SELECT COUNT(*) FROM auth.account WHERE user_id = $1', [
        userId,
      ]);
      expect(parseInt(accountResult.rows[0].count, 10)).toBe(0);
    });
  });

  describe('Boundary & Special Values', () => {
    it('should handle very long email addresses', async () => {
      const { app } = getContext();

      // Email with 254 characters (max valid length)
      const longEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.com`;

      const response = await app.fetch(
        new Request('http://localhost/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: longEmail,
            password: 'SecurePassword123',
            name: 'Long Email User',
          }),
        }),
      );

      // Should either accept or reject gracefully
      expect([200, 400, 422]).toContain(response.status);
    });

    it('should handle password with exactly minimum length', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'minpwd-ba@example.com',
            password: 'Ee123456',
            name: 'Min Pwd User',
          }),
        }),
      );

      expect(response.status).toBe(200);
    });

    it('should handle password with special characters', async () => {
      const { app } = getContext();

      const specialPasswords = [
        'P@ssw0rd!#$%',
        'Pass!@#$%^&*()',
        'Pässwörd123',
        'パスワード123abc',
      ];

      for (const password of specialPasswords) {
        const response = await app.fetch(
          new Request('http://localhost/api/auth/sign-up/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `special-${Math.random().toString(36).slice(2)}@example.com`,
              password,
              name: 'Special Pwd User',
            }),
          }),
        );

        // Should handle special characters gracefully
        expect([200, 400, 422]).toContain(response.status);
      }
    });

    it('should handle very long passwords', async () => {
      const { app } = getContext();

      const longPassword = `A1!${'a'.repeat(200)}`;

      const response = await app.fetch(
        new Request('http://localhost/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'longpwd-ba@example.com',
            password: longPassword,
            name: 'Long Pwd User',
          }),
        }),
      );

      // Should either accept or reject gracefully
      expect([200, 400, 422]).toContain(response.status);
    });

    it('should handle email with plus addressing (RFC 5233)', async () => {
      const { app } = getContext();

      const email = 'user+test-ba@example.com';

      const { response, body } = await signUp(app, email, 'SecurePassword123');

      expect(response.status).toBe(200);
      expect(body.user.email).toBe(email);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent sign-up attempts with same email', async () => {
      const { app } = getContext();

      const email = 'concurrent-signup@example.com';
      const password = 'SecurePassword123';

      // Make 5 concurrent sign-up requests
      const requests = Array.from({ length: 5 }, () =>
        app.fetch(
          new Request('http://localhost/api/auth/sign-up/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: 'Concurrent User' }),
          }),
        ),
      );

      const responses = await Promise.all(requests);

      // Exactly one should succeed, others should fail
      const successCount = responses.filter((r) => r.status === 200).length;
      const failureCount = responses.filter((r) => r.status !== 200).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(4);
    });

    it('should handle concurrent sign-in attempts', async () => {
      const { app } = getContext();

      const email = 'concurrent-signin@example.com';
      const password = 'SecurePassword123';

      // Sign up first
      await signUp(app, email, password);

      // Make 10 concurrent sign-in requests
      const requests = Array.from({ length: 10 }, () =>
        app.fetch(
          new Request('http://localhost/api/auth/sign-in/email', {
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

      // All should have unique session cookies
      const tokens = responses.map((r) => {
        const cookies = extractCookies(r);
        return extractSessionToken(cookies);
      });
      const uniqueTokens = new Set(tokens.filter(Boolean));

      expect(uniqueTokens.size).toBe(10);
    });
  });

  describe('Session Cookie Handling', () => {
    it('should reject requests without session cookie on protected routes', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/auth/me', {
          method: 'GET',
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid session cookie', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/auth/me', {
          method: 'GET',
          headers: { Cookie: 'better-auth.session_token=invalid-token-value' },
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should set session cookie on successful sign-in', async () => {
      const { app } = getContext();

      const email = 'cookie-check@example.com';
      const password = 'SecurePassword123';

      await signUp(app, email, password);

      const { response } = await signIn(app, email, password);

      expect(response.status).toBe(200);

      const cookies = extractCookies(response);
      const sessionToken = extractSessionToken(cookies);
      expect(sessionToken).toBeTruthy();
    });
  });
});
