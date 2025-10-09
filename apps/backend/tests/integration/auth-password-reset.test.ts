import { describe, expect, it } from 'vitest';
import { hashSessionToken } from '../../src/utils/auth.js';
import { countUserSessions, setupAuthTestSuite } from './auth.helpers.js';

describe('Auth Endpoints - Password Reset Flow', () => {
  const { getContext } = setupAuthTestSuite();

  describe('POST /api/auth/forgot-password', () => {
    it('should successfully request password reset for existing user', async () => {
      const { app, pool } = getContext();

      const email = 'resetuser@example.com';
      const password = 'SecurePassword123';

      // Register a user
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      await app.fetch(registerRequest);

      // Request password reset
      const resetRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const resetResponse = await app.fetch(resetRequest);
      const body: any = await resetResponse.json();

      expect(resetResponse.status).toBe(200);
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('password reset');

      // Should return a reset token (only in MVP - remove in production)
      expect(body).toHaveProperty('resetToken');
      expect(body.resetToken).toMatch(/^[a-f0-9]{64}$/);

      // Verify token was stored in database
      const tokenHash = hashSessionToken(body.resetToken);
      const result = await pool.query(
        'SELECT * FROM auth.password_reset_tokens WHERE token_hash = $1',
        [tokenHash],
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].used_at).toBeNull();

      // Check expiration (should be ~1 hour)
      const expiresAt = new Date(result.rows[0].expires_at);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      expect(diffMinutes).toBeGreaterThan(59);
      expect(diffMinutes).toBeLessThan(61);
    });

    it('should return success even for non-existent user (prevent user enumeration)', async () => {
      const { app } = getContext();

      const resetRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      });

      const resetResponse = await app.fetch(resetRequest);
      const body: any = await resetResponse.json();

      // Should return 200 (don't reveal if user exists)
      expect(resetResponse.status).toBe(200);
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('password reset');

      // Should still return a token to prevent timing attacks
      expect(body).toHaveProperty('resetToken');
    });

    it('should allow multiple reset requests (creates new token each time)', async () => {
      const { app, pool } = getContext();

      const email = 'multiplereset@example.com';
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
      const userExternalId = registerBody.user.externalId;

      // Get user ID
      const userResult = await pool.query('SELECT id FROM auth.users WHERE external_id = $1', [
        userExternalId,
      ]);
      const userId = userResult.rows[0].id;

      // First reset request
      const reset1 = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const response1 = await app.fetch(reset1);
      const body1: any = await response1.json();

      // Second reset request
      const reset2 = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const response2 = await app.fetch(reset2);
      const body2: any = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Should generate different tokens
      expect(body1.resetToken).not.toBe(body2.resetToken);

      // Should have 2 tokens in database
      const tokensResult = await pool.query(
        'SELECT COUNT(*) FROM auth.password_reset_tokens WHERE user_id = $1',
        [userId],
      );
      expect(parseInt(tokensResult.rows[0].count, 10)).toBe(2);
    });

    it('should return 400 for missing email', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('error');
    });

    it('should return 400 for invalid email format', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'not-an-email',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should successfully reset password with valid token', async () => {
      const { app, pool } = getContext();

      const email = 'validreset@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: oldPassword }),
      });

      await app.fetch(registerRequest);

      // Request password reset
      const forgotRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const forgotResponse = await app.fetch(forgotRequest);
      const forgotBody: any = await forgotResponse.json();
      const resetToken = forgotBody.resetToken;

      // Reset password
      const resetRequest = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password: newPassword,
        }),
      });

      const resetResponse = await app.fetch(resetRequest);
      const resetBody: any = await resetResponse.json();

      expect(resetResponse.status).toBe(200);
      expect(resetBody).toHaveProperty('message');
      expect(resetBody.message).toContain('Password reset successfully');

      // Verify token was marked as used
      const tokenHash = hashSessionToken(resetToken);
      const tokenResult = await pool.query(
        'SELECT used_at FROM auth.password_reset_tokens WHERE token_hash = $1',
        [tokenHash],
      );

      expect(tokenResult.rows[0].used_at).not.toBeNull();

      // Verify old password no longer works
      const oldLoginRequest = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: oldPassword }),
      });

      const oldLoginResponse = await app.fetch(oldLoginRequest);
      expect(oldLoginResponse.status).toBe(401);

      // Verify new password works
      const newLoginRequest = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: newPassword }),
      });

      const newLoginResponse = await app.fetch(newLoginRequest);
      expect(newLoginResponse.status).toBe(200);
    });

    it('should invalidate all user sessions after password reset', async () => {
      const { app, pool } = getContext();

      const email = 'sessioninvalidate@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Register (creates 1st session)
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: oldPassword }),
      });

      const registerResponse = await app.fetch(registerRequest);
      const registerBody: any = await registerResponse.json();
      const userExternalId = registerBody.user.externalId;

      // Login again (creates 2nd session)
      const loginRequest = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: oldPassword }),
      });

      await app.fetch(loginRequest);

      // Verify 2 sessions exist
      let sessionCount = await countUserSessions(pool, userExternalId);
      expect(sessionCount).toBe(2);

      // Request and complete password reset
      const forgotRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const forgotResponse = await app.fetch(forgotRequest);
      const forgotBody: any = await forgotResponse.json();

      const resetRequest = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: forgotBody.resetToken,
          password: newPassword,
        }),
      });

      await app.fetch(resetRequest);

      // Verify all sessions were deleted
      sessionCount = await countUserSessions(pool, userExternalId);
      expect(sessionCount).toBe(0);
    });

    it('should return 400 for invalid/expired token', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'invalid-token-1234567890abcdef1234567890abcdef1234567890abcdef12',
          password: 'NewPassword123',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Invalid or expired');
    });

    it('should return 400 for already used token', async () => {
      const { app } = getContext();

      const email = 'usedtoken@example.com';
      const password = 'OldPassword123';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      await app.fetch(registerRequest);

      // Get reset token
      const forgotRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const forgotResponse = await app.fetch(forgotRequest);
      const forgotBody: any = await forgotResponse.json();
      const resetToken = forgotBody.resetToken;

      // Use token once
      const reset1 = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password: 'NewPassword123',
        }),
      });

      const response1 = await app.fetch(reset1);
      expect(response1.status).toBe(200);

      // Try to use token again
      const reset2 = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password: 'AnotherPassword456',
        }),
      });

      const response2 = await app.fetch(reset2);
      const body2: any = await response2.json();

      expect(response2.status).toBe(400);
      expect(body2).toHaveProperty('error');
      expect(body2.error).toContain('Invalid or expired');
    });

    it('should return 400 for expired token', async () => {
      const { app, pool } = getContext();

      const email = 'expiredtoken@example.com';
      const password = 'OldPassword123';

      // Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      await app.fetch(registerRequest);

      // Get reset token
      const forgotRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const forgotResponse = await app.fetch(forgotRequest);
      const forgotBody: any = await forgotResponse.json();
      const resetToken = forgotBody.resetToken;

      // Manually expire the token
      const tokenHash = hashSessionToken(resetToken);
      await pool.query(
        "UPDATE auth.password_reset_tokens SET expires_at = NOW() - INTERVAL '1 hour' WHERE token_hash = $1",
        [tokenHash],
      );

      // Try to use expired token
      const resetRequest = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password: 'NewPassword123',
        }),
      });

      const resetResponse = await app.fetch(resetRequest);
      const body: any = await resetResponse.json();

      expect(resetResponse.status).toBe(400);
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Invalid or expired');
    });

    it('should return 400 for missing token', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'NewPassword123',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('error');
    });

    it('should return 400 for missing password', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'some-token-12345678901234567890123456789012345678901234567890',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('error');
    });

    it('should return 400 for new password less than 8 characters', async () => {
      const { app } = getContext();

      const email = 'shortpwd@example.com';
      const password = 'OldPassword123';

      // Register and get reset token
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      await app.fetch(registerRequest);

      const forgotRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const forgotResponse = await app.fetch(forgotRequest);
      const forgotBody: any = await forgotResponse.json();

      // Try to reset with short password
      const resetRequest = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: forgotBody.resetToken,
          password: 'Short1',
        }),
      });

      const resetResponse = await app.fetch(resetRequest);
      const body = await resetResponse.json();

      expect(resetResponse.status).toBe(400);
      expect(body).toHaveProperty('error');
    });

    it('should hash new password before storing', async () => {
      const { app, pool } = getContext();

      const email = 'hashcheck@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Register and get reset token
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: oldPassword }),
      });

      await app.fetch(registerRequest);

      const forgotRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const forgotResponse = await app.fetch(forgotRequest);
      const forgotBody: any = await forgotResponse.json();

      // Reset password
      const resetRequest = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: forgotBody.resetToken,
          password: newPassword,
        }),
      });

      await app.fetch(resetRequest);

      // Check password in database
      const userResult = await pool.query('SELECT password_hash FROM auth.users WHERE email = $1', [
        email,
      ]);

      const passwordHash = userResult.rows[0].password_hash;

      // Should be hashed (not plaintext)
      expect(passwordHash).not.toBe(newPassword);
      expect(passwordHash).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt format
    });
  });

  describe('Password Reset Flow - Complete Integration', () => {
    it('should complete full password reset flow: forgot → reset → login', async () => {
      const { app } = getContext();

      const email = 'fullflow@example.com';
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Step 1: Register
      const registerRequest = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: oldPassword }),
      });

      const registerResponse = await app.fetch(registerRequest);
      expect(registerResponse.status).toBe(201);

      // Step 2: Request password reset
      const forgotRequest = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const forgotResponse = await app.fetch(forgotRequest);
      expect(forgotResponse.status).toBe(200);

      const forgotBody: any = await forgotResponse.json();
      const resetToken = forgotBody.resetToken;

      // Step 3: Reset password
      const resetRequest = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password: newPassword,
        }),
      });

      const resetResponse = await app.fetch(resetRequest);
      expect(resetResponse.status).toBe(200);

      // Step 4: Login with new password
      const loginRequest = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: newPassword }),
      });

      const loginResponse = await app.fetch(loginRequest);
      const loginBody = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginBody).toHaveProperty('user');
      expect(loginBody).toHaveProperty('accessToken');
      expect(loginBody).toHaveProperty('sessionToken');
    });

    it('should handle multiple users with simultaneous reset requests', async () => {
      const { app } = getContext();

      const user1Email = 'user1reset@example.com';
      const user2Email = 'user2reset@example.com';
      const password = 'SecurePassword123';

      // Register both users
      await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user1Email, password }),
        }),
      );

      await app.fetch(
        new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user2Email, password }),
        }),
      );

      // Both request password reset
      const forgot1Response = await app.fetch(
        new Request('http://localhost/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user1Email }),
        }),
      );

      const forgot2Response = await app.fetch(
        new Request('http://localhost/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user2Email }),
        }),
      );

      const forgot1Body: any = await forgot1Response.json();
      const forgot2Body: any = await forgot2Response.json();

      // Tokens should be different
      expect(forgot1Body.resetToken).not.toBe(forgot2Body.resetToken);

      // User 1 resets password
      const reset1Response = await app.fetch(
        new Request('http://localhost/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: forgot1Body.resetToken,
            password: 'NewPassword1',
          }),
        }),
      );

      expect(reset1Response.status).toBe(200);

      // User 2's token should still be valid
      const reset2Response = await app.fetch(
        new Request('http://localhost/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: forgot2Body.resetToken,
            password: 'NewPassword2',
          }),
        }),
      );

      expect(reset2Response.status).toBe(200);

      // Both should be able to login with their new passwords
      const login1Response = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user1Email, password: 'NewPassword1' }),
        }),
      );

      const login2Response = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user2Email, password: 'NewPassword2' }),
        }),
      );

      expect(login1Response.status).toBe(200);
      expect(login2Response.status).toBe(200);
    });
  });
});
