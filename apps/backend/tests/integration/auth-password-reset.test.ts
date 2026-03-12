import { describe, expect, it } from 'vitest';
import { setupAuthTestSuite } from './auth.helpers.js';

/**
 * Helper to register a user via Better Auth's sign-up endpoint.
 */
async function signUp(
  app: { fetch: (req: Request) => Response | Promise<Response> },
  email: string,
  password: string,
) {
  const response = await app.fetch(
    new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: email.split('@')[0] }),
    }),
  );
  return response;
}

/**
 * Helper to sign in via Better Auth's sign-in endpoint.
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
  return response;
}

/**
 * Helper to request a password reset via Better Auth.
 */
async function requestPasswordReset(
  app: { fetch: (req: Request) => Response | Promise<Response> },
  email: string,
) {
  const response = await app.fetch(
    new Request('http://localhost/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo: 'http://localhost:5173/reset-password' }),
    }),
  );
  return response;
}

/**
 * Helper to extract the reset token from the auth.verification table.
 * Better Auth stores verification entries with identifier = user email
 * and the value contains the token.
 * The reset URL logged by sendResetPassword contains the token as a query param.
 * We query the DB directly to retrieve the token for testing.
 */
async function getResetTokenFromDb(pool: import('pg').Pool, email: string): Promise<string | null> {
  // Better Auth stores verification entries with:
  //   identifier = 'reset-password:<token>'
  //   value = user ID
  // We join with auth."user" to filter by email.
  const result = await pool.query(
    `SELECT v.identifier
     FROM auth.verification v
     JOIN auth."user" u ON v.value = u.id
     WHERE v.identifier LIKE 'reset-password:%' AND u.email = $1
     ORDER BY v.created_at DESC
     LIMIT 1`,
    [email],
  );

  if (result.rows.length === 0) return null;
  // Extract the token from the identifier (strip 'reset-password:' prefix)
  return result.rows[0].identifier.replace('reset-password:', '');
}

/**
 * Helper to reset password via Better Auth.
 */
async function resetPassword(
  app: { fetch: (req: Request) => Response | Promise<Response> },
  token: string,
  newPassword: string,
) {
  const response = await app.fetch(
    new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, token }),
    }),
  );
  return response;
}

describe('Auth Endpoints - Password Reset Flow (Better Auth)', () => {
  const { getContext } = setupAuthTestSuite();

  describe('POST /api/auth/forget-password', () => {
    it('should successfully request password reset for existing user', async () => {
      const { app, pool } = getContext();

      const email = 'resetuser@example.com';
      const password = 'SecurePassword123';

      // Register a user
      await signUp(app, email, password);

      // Request password reset
      const resetResponse = await requestPasswordReset(app, email);
      expect(resetResponse.status).toBe(200);

      // Better Auth may return { status: true } or an empty body for forget-password
      const text = await resetResponse.text();
      if (text) {
        const body = JSON.parse(text);
        expect(body).toHaveProperty('status', true);
      }

      // Verify a verification token was stored in the database
      const result = await pool.query(
        `SELECT * FROM auth.verification
         ORDER BY created_at DESC LIMIT 1`,
      );

      expect(result.rows.length).toBe(1);
      // Better Auth stores identifier as 'reset-password:<token>'
      expect(result.rows[0].identifier).toMatch(/^reset-password:/);
      // Better Auth stores the user ID as the value
      expect(result.rows[0].value).toBeTruthy();

      // Check expiration is set in the future
      const expiresAt = new Date(result.rows[0].expires_at);
      const now = new Date();
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should return success even for non-existent user (prevent user enumeration)', async () => {
      const { app } = getContext();

      const resetResponse = await requestPasswordReset(app, 'nonexistent@example.com');

      // Better Auth returns 200 to prevent user enumeration
      expect(resetResponse.status).toBe(200);

      // Better Auth may return { status: true } or an empty body
      const text = await resetResponse.text();
      if (text) {
        const body = JSON.parse(text);
        expect(body).toHaveProperty('status', true);
      }
    });

    it('should allow multiple reset requests (creates new verification each time)', async () => {
      const { app, pool } = getContext();

      const email = 'multiplereset@example.com';
      const password = 'SecurePassword123';

      // Register
      await signUp(app, email, password);

      // First reset request
      const response1 = await requestPasswordReset(app, email);
      expect(response1.status).toBe(200);

      // Get first token
      const firstToken = await getResetTokenFromDb(pool, email);

      // Second reset request
      const response2 = await requestPasswordReset(app, email);
      expect(response2.status).toBe(200);

      // Get second token
      const secondToken = await getResetTokenFromDb(pool, email);

      // Tokens should be different
      expect(firstToken).toBeTruthy();
      expect(secondToken).toBeTruthy();
      expect(firstToken).not.toBe(secondToken);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should successfully reset password with valid token', async () => {
      const { app, pool } = getContext();

      const email = 'validreset@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Register
      await signUp(app, email, oldPassword);

      // Request password reset
      await requestPasswordReset(app, email);

      // Get the token from the database
      const token = await getResetTokenFromDb(pool, email);
      expect(token).toBeTruthy();

      // Reset password
      const resetResponse = await resetPassword(app, token as string, newPassword);

      expect(resetResponse.status).toBe(200);

      // Verify old password no longer works
      const oldLoginResponse = await signIn(app, email, oldPassword);
      expect(oldLoginResponse.status).not.toBe(200);

      // Verify new password works
      const newLoginResponse = await signIn(app, email, newPassword);
      expect(newLoginResponse.status).toBe(200);
    });

    it('should invalidate all user sessions after password reset', async () => {
      const { app, pool } = getContext();

      const email = 'sessioninvalidate@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Register (creates 1st session)
      const registerResponse = await signUp(app, email, oldPassword);
      const registerBody: any = await registerResponse.json();
      const userId = registerBody.user?.id;

      // Login again (creates 2nd session)
      await signIn(app, email, oldPassword);

      // Verify sessions exist (Better Auth uses auth.session table)
      const sessionsBefore = await pool.query(
        'SELECT COUNT(*) FROM auth.session WHERE user_id = $1',
        [userId],
      );
      expect(parseInt(sessionsBefore.rows[0].count, 10)).toBeGreaterThanOrEqual(2);

      // Request and complete password reset
      await requestPasswordReset(app, email);
      const token = await getResetTokenFromDb(pool, email);
      expect(token).toBeTruthy();

      await resetPassword(app, token as string, newPassword);

      // Verify all sessions were deleted after password reset
      const sessionsAfter = await pool.query(
        'SELECT COUNT(*) FROM auth.session WHERE user_id = $1',
        [userId],
      );
      expect(parseInt(sessionsAfter.rows[0].count, 10)).toBe(0);
    });

    it('should reject an invalid/nonexistent token', async () => {
      const { app } = getContext();

      const resetResponse = await resetPassword(
        app,
        'totally-invalid-token-value',
        'NewPassword123',
      );

      // Better Auth should reject invalid tokens
      expect(resetResponse.status).not.toBe(200);

      // The response should indicate an error; safely parse the body
      const text = await resetResponse.text();
      if (text) {
        const body = JSON.parse(text);
        expect(body).toBeDefined();
      }
    });

    it('should reject an already-used token', async () => {
      const { app, pool } = getContext();

      const email = 'usedtoken@example.com';
      const password = 'OldPassword123';

      // Register
      await signUp(app, email, password);

      // Get reset token
      await requestPasswordReset(app, email);
      const token = await getResetTokenFromDb(pool, email);
      expect(token).toBeTruthy();

      // Use token once
      const response1 = await resetPassword(app, token as string, 'NewPassword123');
      expect(response1.status).toBe(200);

      // Try to use the same token again
      const response2 = await resetPassword(app, token as string, 'AnotherPassword456');

      // Should be rejected (token consumed on first use)
      expect(response2.status).not.toBe(200);
    });

    it('should reject an expired token', async () => {
      const { app, pool } = getContext();

      const email = 'expiredtoken@example.com';
      const password = 'OldPassword123';

      // Register
      await signUp(app, email, password);

      // Get reset token
      await requestPasswordReset(app, email);
      const token = await getResetTokenFromDb(pool, email);
      expect(token).toBeTruthy();

      // Manually expire the verification entry in the database
      await pool.query(
        `UPDATE auth.verification SET expires_at = NOW() - INTERVAL '1 hour'
         WHERE identifier = $1`,
        [`reset-password:${token}`],
      );

      // Try to use the expired token
      const resetResponse = await resetPassword(app, token as string, 'NewPassword123');

      // Should be rejected
      expect(resetResponse.status).not.toBe(200);
    });
  });

  describe('Password Reset Flow - Complete Integration', () => {
    it('should complete full password reset flow: request reset -> reset -> sign in', async () => {
      const { app, pool } = getContext();

      const email = 'fullflow@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Step 1: Register
      const registerResponse = await signUp(app, email, oldPassword);
      expect(registerResponse.status).toBe(200);

      // Step 2: Request password reset
      const forgotResponse = await requestPasswordReset(app, email);
      expect(forgotResponse.status).toBe(200);

      // Step 3: Get token from DB and reset password
      const token = await getResetTokenFromDb(pool, email);
      expect(token).toBeTruthy();

      const resetResponse = await resetPassword(app, token as string, newPassword);
      expect(resetResponse.status).toBe(200);

      // Step 4: Sign in with new password
      const loginResponse = await signIn(app, email, newPassword);
      expect(loginResponse.status).toBe(200);

      const loginBody: any = await loginResponse.json();
      expect(loginBody).toHaveProperty('user');
    });

    it('should handle multiple users with simultaneous reset requests', async () => {
      const { app, pool } = getContext();

      const user1Email = 'user1reset@example.com';
      const user2Email = 'user2reset@example.com';
      const password = 'SecurePassword123';

      // Register both users
      await signUp(app, user1Email, password);
      await signUp(app, user2Email, password);

      // User 1 requests reset
      await requestPasswordReset(app, user1Email);
      const token1 = await getResetTokenFromDb(pool, user1Email);

      // User 2 requests reset
      await requestPasswordReset(app, user2Email);
      const token2 = await getResetTokenFromDb(pool, user2Email);

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);

      // User 1 resets password
      const reset1Response = await resetPassword(app, token1 as string, 'NewPassword1!');
      expect(reset1Response.status).toBe(200);

      // User 2's token should still be valid
      const reset2Response = await resetPassword(app, token2 as string, 'NewPassword2!');
      expect(reset2Response.status).toBe(200);

      // Both should be able to sign in with their new passwords
      const login1Response = await signIn(app, user1Email, 'NewPassword1!');
      const login2Response = await signIn(app, user2Email, 'NewPassword2!');

      expect(login1Response.status).toBe(200);
      expect(login2Response.status).toBe(200);
    });

    it('should hash the new password (not store plaintext)', async () => {
      const { app, pool } = getContext();

      const email = 'hashcheck@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Register and reset password
      await signUp(app, email, oldPassword);
      await requestPasswordReset(app, email);
      const token = await getResetTokenFromDb(pool, email);
      expect(token).toBeTruthy();

      await resetPassword(app, token as string, newPassword);

      // Check password in Better Auth account table
      const accountResult = await pool.query(
        `SELECT a.password FROM auth.account a
         JOIN auth."user" u ON a.user_id = u.id
         WHERE u.email = $1 AND a.provider_id = 'credential'`,
        [email],
      );

      const storedPassword = accountResult.rows[0]?.password;

      // Should be hashed (not plaintext)
      expect(storedPassword).not.toBe(newPassword);
      expect(storedPassword).toBeTruthy();
      // The hash should be either bcrypt ($2b$) or scrypt format (used by Better Auth)
      expect(storedPassword?.length).toBeGreaterThan(20);
    });
  });
});
