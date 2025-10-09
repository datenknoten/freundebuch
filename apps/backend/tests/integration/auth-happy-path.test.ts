import { describe, expect, it } from 'vitest';
import { hashSessionToken } from '../../src/utils/auth.js';
import {
  countUserSessions,
  extractSessionToken,
  getUserByEmail,
  sessionExists,
  setupAuthTestSuite,
} from './auth.helpers.js';

describe('Auth Endpoints - Happy Path Integration Tests', () => {
  const { getContext } = setupAuthTestSuite();

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const { app, pool } = getContext();

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePassword123',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      // Should return 201 Created
      expect(response.status).toBe(201);

      // Should return user data and tokens
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('externalId');
      expect(body.user).toHaveProperty('email', 'newuser@example.com');
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('sessionToken');

      // Access token should be a JWT (3 parts separated by dots)
      expect(body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

      // Session token should be a 64-character hex string
      expect(body.sessionToken).toMatch(/^[a-f0-9]{64}$/);

      // Should set HTTP-only session cookie
      const cookieHeader = response.headers.get('Set-Cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain('session_token=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Path=/');

      // Verify user was created in database
      const user = await getUserByEmail(pool, 'newuser@example.com');
      expect(user).toBeTruthy();
      expect(user?.email).toBe('newuser@example.com');
      expect(user?.externalId).toBe(body.user.externalId);

      // Password should be hashed (not plaintext)
      expect(user?.passwordHash).not.toBe('SecurePassword123');
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt format

      // Verify session was created in database
      const tokenHash = hashSessionToken(body.sessionToken);
      const exists = await sessionExists(pool, tokenHash);
      expect(exists).toBe(true);
    });

    it('should create session with correct expiration (7 days)', async () => {
      const { app, pool } = getContext();

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'expiry-test@example.com',
          password: 'SecurePassword123',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);

      // Check session expiration in database
      const tokenHash = hashSessionToken(body.sessionToken);
      const result = await pool.query(
        'SELECT expires_at FROM auth.sessions WHERE token_hash = $1',
        [tokenHash],
      );

      expect(result.rows.length).toBe(1);

      const expiresAt = new Date(result.rows[0].expires_at);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // Should expire in approximately 7 days (allow ~1 hour tolerance for test execution)
      expect(diffDays).toBeGreaterThan(6.95);
      expect(diffDays).toBeLessThan(7.05);
    });

    it('should set session cookie with correct attributes', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'cookie-test@example.com',
          password: 'SecurePassword123',
        }),
      });

      const response = await app.fetch(request);
      expect(response.status).toBe(201);

      const cookieHeader = response.headers.get('Set-Cookie');
      expect(cookieHeader).toBeTruthy();

      // Check cookie attributes
      expect(cookieHeader).toContain('HttpOnly'); // Prevent JavaScript access
      expect(cookieHeader).toContain('SameSite=Lax'); // CSRF protection
      expect(cookieHeader).toContain('Max-Age=604800'); // 7 days in seconds
      expect(cookieHeader).toContain('Path=/'); // Available for entire site

      // In production, should have Secure flag
      // expect(cookieHeader).toContain('Secure');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with correct credentials', async () => {
      const { app, pool } = getContext();

      const email = 'logintest@example.com';
      const password = 'SecurePassword123';

      // First, register a user
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const registerResponse = await app.fetch(registerRequest);
      expect(registerResponse.status).toBe(201);

      // Now login with the same credentials
      const loginRequest = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const loginResponse = await app.fetch(loginRequest);
      const body: any = await loginResponse.json();

      // Should return 200 OK
      expect(loginResponse.status).toBe(200);

      // Should return user data and tokens
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('externalId');
      expect(body.user).toHaveProperty('email', email);
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('sessionToken');

      // Should set HTTP-only session cookie
      const cookieHeader = loginResponse.headers.get('Set-Cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain('session_token=');
      expect(cookieHeader).toContain('HttpOnly');

      // Verify new session was created in database
      const tokenHash = hashSessionToken(body.sessionToken);
      const exists = await sessionExists(pool, tokenHash);
      expect(exists).toBe(true);
    });

    it('should create a new session on each login', async () => {
      const { app, pool } = getContext();

      const email = 'multisession@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const registerResponse = await app.fetch(registerRequest);
      const registerBody: any = await registerResponse.json();
      expect(registerResponse.status).toBe(201);

      const userExternalId = registerBody.user.externalId;

      // Should have 1 session
      let sessionCount = await countUserSessions(pool, userExternalId);
      expect(sessionCount).toBe(1);

      // Login again
      const loginRequest = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const loginResponse = await app.fetch(loginRequest);
      expect(loginResponse.status).toBe(200);

      // Should now have 2 sessions (multi-device support)
      sessionCount = await countUserSessions(pool, userExternalId);
      expect(sessionCount).toBe(2);
    });

    it('should return different session tokens on each login', async () => {
      const { app } = getContext();

      const email = 'uniquesession@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      await app.fetch(registerRequest);

      // Login first time
      const loginRequest1 = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const loginResponse1 = await app.fetch(loginRequest1);
      const body1: any = await loginResponse1.json();

      // Login second time
      const loginRequest2 = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const loginResponse2 = await app.fetch(loginRequest2);
      const body2: any = await loginResponse2.json();

      // Session tokens should be different
      expect(body1.sessionToken).not.toBe(body2.sessionToken);

      // Access tokens should be different
      expect(body1.accessToken).not.toBe(body2.accessToken);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout and delete session', async () => {
      const { app, pool } = getContext();

      const email = 'logouttest@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const registerResponse = await app.fetch(registerRequest);
      const registerBody: any = await registerResponse.json();
      const sessionToken = registerBody.sessionToken;

      // Extract session cookie
      const cookieHeader = registerResponse.headers.get('Set-Cookie');
      const cookie = extractSessionToken(cookieHeader);

      // Verify session exists
      const tokenHash = hashSessionToken(sessionToken);
      let exists = await sessionExists(pool, tokenHash);
      expect(exists).toBe(true);

      // Logout
      const logoutRequest = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `session_token=${cookie}`,
        },
      });

      const logoutResponse = await app.fetch(logoutRequest);
      const logoutBody = await logoutResponse.json();

      // Should return 200 OK
      expect(logoutResponse.status).toBe(200);
      expect(logoutBody).toHaveProperty('message', 'Logged out successfully');

      // Should clear session cookie
      const logoutCookieHeader = logoutResponse.headers.get('Set-Cookie');
      expect(logoutCookieHeader).toBeTruthy();
      expect(logoutCookieHeader).toContain('session_token=');
      expect(logoutCookieHeader).toContain('Max-Age=0'); // Clears cookie

      // Verify session was deleted from database
      exists = await sessionExists(pool, tokenHash);
      expect(exists).toBe(false);
    });

    it('should only delete the specific session (not all user sessions)', async () => {
      const { app, pool } = getContext();

      const email = 'multidevicelogout@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const registerResponse = await app.fetch(registerRequest);
      const registerBody: any = await registerResponse.json();
      const session1Token = registerBody.sessionToken;
      const userExternalId = registerBody.user.externalId;

      // Login again (create second session)
      const loginRequest = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const loginResponse = await app.fetch(loginRequest);
      const loginBody: any = await loginResponse.json();
      const session2Token = loginBody.sessionToken;

      // Should have 2 sessions
      let sessionCount = await countUserSessions(pool, userExternalId);
      expect(sessionCount).toBe(2);

      // Logout from first session
      const logoutRequest = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `session_token=${session1Token}`,
        },
      });

      const logoutResponse = await app.fetch(logoutRequest);
      expect(logoutResponse.status).toBe(200);

      // Should now have 1 session
      sessionCount = await countUserSessions(pool, userExternalId);
      expect(sessionCount).toBe(1);

      // Second session should still exist
      const tokenHash2 = hashSessionToken(session2Token);
      const exists = await sessionExists(pool, tokenHash2);
      expect(exists).toBe(true);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should successfully refresh access token using session cookie', async () => {
      const { app } = getContext();

      const email = 'refreshtest@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const registerResponse = await app.fetch(registerRequest);
      const registerBody: any = await registerResponse.json();
      const originalAccessToken = registerBody.accessToken;
      const sessionToken = registerBody.sessionToken;

      // Wait a moment to ensure new token has different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Refresh token using cookie
      const refreshRequest = new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: `session_token=${sessionToken}`,
        },
      });

      const refreshResponse = await app.fetch(refreshRequest);
      const refreshBody: any = await refreshResponse.json();

      // Should return 200 OK
      expect(refreshResponse.status).toBe(200);

      // Should return user data and tokens
      expect(refreshBody).toHaveProperty('user');
      expect(refreshBody.user).toHaveProperty('externalId', registerBody.user.externalId);
      expect(refreshBody.user).toHaveProperty('email', email);
      expect(refreshBody).toHaveProperty('accessToken');
      expect(refreshBody).toHaveProperty('sessionToken');

      // Access token should be different (new token with new expiry)
      expect(refreshBody.accessToken).not.toBe(originalAccessToken);

      // Session token should be the same (we don't rotate session tokens on refresh)
      expect(refreshBody.sessionToken).toBe(sessionToken);
    });

    it('should successfully refresh access token using session token in body', async () => {
      const { app } = getContext();

      const email = 'refreshbody@example.com';
      const password = 'SecurePassword123';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const registerResponse = await app.fetch(registerRequest);
      const registerBody: any = await registerResponse.json();
      const sessionToken = registerBody.sessionToken;

      // Refresh token using body (no cookie)
      const refreshRequest = new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken }),
      });

      const refreshResponse = await app.fetch(refreshRequest);
      const refreshBody: any = await refreshResponse.json();

      // Should return 200 OK
      expect(refreshResponse.status).toBe(200);

      // Should return user data and tokens
      expect(refreshBody).toHaveProperty('user');
      expect(refreshBody).toHaveProperty('accessToken');
      expect(refreshBody).toHaveProperty('sessionToken', sessionToken);
    });

    it('should prefer session cookie over body when both provided', async () => {
      const { app } = getContext();

      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';
      const password = 'SecurePassword123';

      // Register two users
      const register1 = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email1, password }),
      });

      const response1 = await app.fetch(register1);
      const body1: any = await response1.json();
      const sessionToken1 = body1.sessionToken;

      const register2 = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email2, password }),
      });

      const response2 = await app.fetch(register2);
      const body2: any = await response2.json();
      const sessionToken2 = body2.sessionToken;

      // Refresh with user1's cookie but user2's token in body
      const refreshRequest = new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session_token=${sessionToken1}`,
        },
        body: JSON.stringify({ sessionToken: sessionToken2 }),
      });

      const refreshResponse = await app.fetch(refreshRequest);
      const refreshBody: any = await refreshResponse.json();

      expect(refreshResponse.status).toBe(200);

      // Should return user1's data (from cookie, not body)
      expect(refreshBody.user.email).toBe(email1);
      expect(refreshBody.user.externalId).toBe(body1.user.externalId);
    });
  });
});
