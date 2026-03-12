import { describe, expect, it } from 'vitest';
import { extractCookies, setupAuthTestSuite } from './auth.helpers.js';

describe('Auth Endpoints - Happy Path Integration Tests', () => {
  const { getContext } = setupAuthTestSuite();

  /**
   * Helper: sign up a new user via Better Auth and return the parsed
   * response body plus the raw Response (for cookie inspection).
   */
  async function signUp(email: string, password: string, name = email.split('@')[0]) {
    const { app } = getContext();
    const request = new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const response = await app.fetch(request);
    const body: any = await response.json();
    return { response, body };
  }

  /**
   * Helper: sign in an existing user via Better Auth.
   */
  async function signIn(email: string, password: string) {
    const { app } = getContext();
    const request = new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const response = await app.fetch(request);
    const body: any = await response.json();
    return { response, body };
  }

  /**
   * Helper: count sessions for a Better Auth user in auth.session (singular).
   */
  async function countBetterAuthSessions(userId: string): Promise<number> {
    const { pool } = getContext();
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM auth.session WHERE user_id = $1',
      [userId],
    );
    return result.rows[0].count;
  }

  /**
   * Helper: check whether a session token exists in auth.session.
   */
  async function betterAuthSessionExists(token: string): Promise<boolean> {
    const { pool } = getContext();
    const result = await pool.query('SELECT id FROM auth.session WHERE token = $1', [token]);
    return result.rows.length > 0;
  }

  // ── Sign-Up ──────────────────────────────────────────────────────────

  describe('POST /api/auth/sign-up/email', () => {
    it('should successfully register a new user', async () => {
      const { pool } = getContext();
      const { response, body } = await signUp('newuser@example.com', 'SecurePassword123');

      // Should return 200 OK (Better Auth returns 200 for sign-up)
      expect(response.status).toBe(200);

      // Should return user and session objects
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('id');
      expect(body.user).toHaveProperty('email', 'newuser@example.com');
      expect(body.user).toHaveProperty('name', 'newuser');
      expect(body).toHaveProperty('token');
      expect(body.token).toBeTruthy();

      // Should set session cookie
      const cookieHeader = response.headers.get('Set-Cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain('better-auth.session_token=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Path=/');

      // Verify user was created in Better Auth user table
      const userResult = await pool.query(
        'SELECT id, email, name FROM auth."user" WHERE email = $1',
        ['newuser@example.com'],
      );
      expect(userResult.rows.length).toBe(1);
      expect(userResult.rows[0].email).toBe('newuser@example.com');
      expect(userResult.rows[0].id).toBe(body.user.id);

      // Verify password was stored as scrypt hash via account table
      const accountResult = await pool.query(
        'SELECT password FROM auth.account WHERE user_id = $1 AND provider_id = $2',
        [body.user.id, 'credential'],
      );
      expect(accountResult.rows.length).toBe(1);
      expect(accountResult.rows[0].password).not.toBe('SecurePassword123');
      // scrypt hashes do not start with $2 (bcrypt prefix)
      expect(accountResult.rows[0].password).not.toMatch(/^\$2[aby]\$/);

      // Verify session was created in the database (autoSignIn: true)
      const sessionToken = body.token;
      const exists = await betterAuthSessionExists(sessionToken);
      expect(exists).toBe(true);
    });

    it('should create a session automatically on sign-up (autoSignIn)', async () => {
      const { response, body } = await signUp('autosignin@example.com', 'SecurePassword123');

      expect(response.status).toBe(200);
      expect(body.token).toBeTruthy();

      // The session should exist in the database
      const count = await countBetterAuthSessions(body.user.id);
      expect(count).toBe(1);
    });

    it('should set session cookie with correct attributes', async () => {
      const { response } = await signUp('cookie-test@example.com', 'SecurePassword123');
      expect(response.status).toBe(200);

      const cookieHeader = response.headers.get('Set-Cookie');
      expect(cookieHeader).toBeTruthy();

      // Check cookie attributes
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Lax');
      expect(cookieHeader).toContain('Path=/');
    });
  });

  // ── Sign-In ──────────────────────────────────────────────────────────

  describe('POST /api/auth/sign-in/email', () => {
    it('should successfully sign in with correct credentials', async () => {
      const email = 'logintest@example.com';
      const password = 'SecurePassword123';

      // First, register a user
      const { response: regResponse } = await signUp(email, password);
      expect(regResponse.status).toBe(200);

      // Now sign in
      const { response: loginResponse, body } = await signIn(email, password);

      // Should return 200 OK
      expect(loginResponse.status).toBe(200);

      // Should return user and session
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('id');
      expect(body.user).toHaveProperty('email', email);
      expect(body).toHaveProperty('token');
      expect(body.token).toBeTruthy();

      // Should set session cookie
      const cookieHeader = loginResponse.headers.get('Set-Cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain('better-auth.session_token=');
      expect(cookieHeader).toContain('HttpOnly');

      // Session should exist in database
      const exists = await betterAuthSessionExists(body.token);
      expect(exists).toBe(true);
    });

    it('should create a new session on each sign-in', async () => {
      const email = 'multisession@example.com';
      const password = 'SecurePassword123';

      // Register (auto-creates first session)
      const { body: regBody } = await signUp(email, password);
      const userId = regBody.user.id;

      // Should have 1 session from sign-up
      let sessionCount = await countBetterAuthSessions(userId);
      expect(sessionCount).toBe(1);

      // Sign in again
      const { response: loginResponse } = await signIn(email, password);
      expect(loginResponse.status).toBe(200);

      // Should now have 2 sessions (multi-device support)
      sessionCount = await countBetterAuthSessions(userId);
      expect(sessionCount).toBe(2);
    });

    it('should return different session tokens on each sign-in', async () => {
      const email = 'uniquesession@example.com';
      const password = 'SecurePassword123';

      // Register
      await signUp(email, password);

      // Sign in first time
      const { body: body1 } = await signIn(email, password);

      // Sign in second time
      const { body: body2 } = await signIn(email, password);

      // Session tokens should be different
      expect(body1.token).not.toBe(body2.token);
    });
  });

  // ── Sign-Out ─────────────────────────────────────────────────────────

  describe('POST /api/auth/sign-out', () => {
    it('should successfully sign out and delete session', async () => {
      const { app } = getContext();

      const email = 'logouttest@example.com';
      const password = 'SecurePassword123';

      // Register
      const { response: regResponse, body: regBody } = await signUp(email, password);
      const sessionToken = regBody.token;

      // Extract cookies from registration response
      const cookies = extractCookies(regResponse);

      // Verify session exists
      let exists = await betterAuthSessionExists(sessionToken);
      expect(exists).toBe(true);

      // Sign out
      const signOutRequest = new Request('http://localhost/api/auth/sign-out', {
        method: 'POST',
        headers: {
          Cookie: cookies,
        },
      });

      const signOutResponse = await app.fetch(signOutRequest);

      // Should return 200 OK
      expect(signOutResponse.status).toBe(200);

      // Should clear session cookie
      const signOutCookieHeader = signOutResponse.headers.get('Set-Cookie');
      expect(signOutCookieHeader).toBeTruthy();
      expect(signOutCookieHeader).toContain('better-auth.session_token=');

      // Verify session was deleted from database
      exists = await betterAuthSessionExists(sessionToken);
      expect(exists).toBe(false);
    });

    it('should only delete the specific session (not all user sessions)', async () => {
      const { app } = getContext();

      const email = 'multidevicelogout@example.com';
      const password = 'SecurePassword123';

      // Register (creates session 1)
      const { response: regResponse, body: regBody } = await signUp(email, password);
      const session1Token = regBody.token;
      const userId = regBody.user.id;
      const session1Cookies = extractCookies(regResponse);

      // Sign in again (creates session 2)
      const { body: loginBody } = await signIn(email, password);
      const session2Token = loginBody.token;

      // Should have 2 sessions
      let sessionCount = await countBetterAuthSessions(userId);
      expect(sessionCount).toBe(2);

      // Sign out from first session
      const signOutRequest = new Request('http://localhost/api/auth/sign-out', {
        method: 'POST',
        headers: {
          Cookie: session1Cookies,
        },
      });

      const signOutResponse = await app.fetch(signOutRequest);
      expect(signOutResponse.status).toBe(200);

      // Should now have 1 session
      sessionCount = await countBetterAuthSessions(userId);
      expect(sessionCount).toBe(1);

      // Second session should still exist
      const exists = await betterAuthSessionExists(session2Token);
      expect(exists).toBe(true);

      // First session should be gone
      const gone = await betterAuthSessionExists(session1Token);
      expect(gone).toBe(false);
    });
  });

  // ── GET /api/auth/me ─────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return the current authenticated user', async () => {
      const { app } = getContext();

      const email = 'metest@example.com';
      const password = 'SecurePassword123';

      // Register
      const { response: regResponse } = await signUp(email, password);
      const cookies = extractCookies(regResponse);

      // Call /api/auth/me with session cookie
      const meRequest = new Request('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Cookie: cookies,
        },
      });

      const meResponse = await app.fetch(meRequest);
      const meBody: any = await meResponse.json();

      expect(meResponse.status).toBe(200);
      expect(meBody).toHaveProperty('user');
      expect(meBody.user).toHaveProperty('externalId');
      expect(meBody.user).toHaveProperty('email', email);
    });

    it('should return 401 without a session cookie', async () => {
      const { app } = getContext();

      const meRequest = new Request('http://localhost/api/auth/me', {
        method: 'GET',
      });

      const meResponse = await app.fetch(meRequest);

      expect(meResponse.status).toBe(401);
    });

    it('should return 401 after sign-out', async () => {
      const { app } = getContext();

      const email = 'me-after-logout@example.com';
      const password = 'SecurePassword123';

      // Register and get cookies
      const { response: regResponse } = await signUp(email, password);
      const cookies = extractCookies(regResponse);

      // Sign out
      const signOutRequest = new Request('http://localhost/api/auth/sign-out', {
        method: 'POST',
        headers: { Cookie: cookies },
      });
      const signOutResponse = await app.fetch(signOutRequest);
      expect(signOutResponse.status).toBe(200);

      // Strip the session_data cache cookie to simulate browser behavior:
      // sign-out sets Max-Age=0 on session_data, so browsers delete it.
      const sessionTokenOnly = cookies
        .split('; ')
        .filter((c) => !c.startsWith('better-auth.session_data='))
        .join('; ');

      // Try /api/auth/me with the now-invalidated cookies
      const meRequest = new Request('http://localhost/api/auth/me', {
        method: 'GET',
        headers: { Cookie: sessionTokenOnly },
      });

      const meResponse = await app.fetch(meRequest);
      expect(meResponse.status).toBe(401);
    });
  });
});
