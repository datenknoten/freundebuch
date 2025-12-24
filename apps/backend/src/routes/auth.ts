import {
  type AuthResponse,
  type ErrorResponse,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
  ResetPasswordRequestSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { AuthService } from '../services/auth.service.js';
import type { AppContext } from '../types/context.js';
import { getClearCookieOptions, getSessionCookieOptions } from '../utils/auth.js';
import { getConfig } from '../utils/config.js';

const app = new Hono<AppContext>();

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post('/register', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      logger.warn({ error: jsonError }, 'Malformed JSON in registration request');
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = RegisterRequestSchema(body);

    if (validated instanceof type.errors) {
      logger.warn({ body, errors: validated }, 'Invalid registration request');
      return c.json<ErrorResponse>(
        {
          error: 'Invalid request',
          details: validated,
        },
        400,
      );
    }

    const authService = new AuthService(db, logger);
    const result = await authService.register(validated);

    // Set session cookie (HTTP-only)
    setCookie(c, 'session_token', result.sessionToken, getSessionCookieOptions());

    logger.info({ userId: result.user.externalId }, 'User registered successfully');

    return c.json<AuthResponse>(result, 201);
  } catch (error) {
    // Check for application-level duplicate user error
    if (error instanceof Error && error.message === 'User already exists') {
      return c.json<ErrorResponse>({ error: error.message }, 409);
    }

    // Check for database-level unique constraint violation (concurrent requests)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505' // PostgreSQL unique constraint violation
    ) {
      logger.warn({ error }, 'Duplicate user registration (database constraint)');
      return c.json<ErrorResponse>({ error: 'User already exists' }, 409);
    }

    logger.error({ error }, 'Registration failed');
    return c.json<ErrorResponse>({ error: 'Registration failed' }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login an existing user
 */
app.post('/login', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      logger.warn({ error: jsonError }, 'Malformed JSON in login request');
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = LoginRequestSchema(body);

    if (validated instanceof type.errors) {
      logger.warn({ body, errors: validated }, 'Invalid login request');
      return c.json<ErrorResponse>(
        {
          error: 'Invalid request',
          details: validated,
        },
        400,
      );
    }

    const authService = new AuthService(db, logger);
    const result = await authService.login(validated);

    // Set session cookie (HTTP-only)
    setCookie(c, 'session_token', result.sessionToken, getSessionCookieOptions());

    logger.info({ userId: result.user.externalId }, 'User logged in successfully');

    return c.json<AuthResponse>(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return c.json<ErrorResponse>({ error: 'Invalid credentials' }, 401);
    }

    logger.error({ error }, 'Login failed');
    return c.json<ErrorResponse>({ error: 'Login failed' }, 500);
  }
});

/**
 * POST /api/auth/logout
 * Logout the current user
 */
app.post('/logout', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const sessionToken = getCookie(c, 'session_token');

    if (!sessionToken) {
      return c.json<ErrorResponse>({ error: 'No active session' }, 401);
    }

    const authService = new AuthService(db, logger);
    await authService.logout(sessionToken);

    // Clear session cookie
    setCookie(c, 'session_token', '', getClearCookieOptions());

    logger.info('User logged out successfully');

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error({ error }, 'Logout failed');
    return c.json<ErrorResponse>({ error: 'Logout failed' }, 500);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh the access token using the session token
 */
app.post('/refresh', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    // Try to get session token from cookie first, then from body
    let sessionToken = getCookie(c, 'session_token');

    if (!sessionToken) {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch (jsonError) {
        logger.warn({ error: jsonError }, 'Malformed JSON in refresh request');
        return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
      }

      const validated = RefreshRequestSchema(body);

      if (validated instanceof type.errors) {
        logger.warn({ body, errors: validated }, 'Invalid refresh request');
        return c.json<ErrorResponse>(
          {
            error: 'Invalid request',
            details: validated,
          },
          400,
        );
      }

      sessionToken = validated.sessionToken;
    }

    if (!sessionToken) {
      return c.json<ErrorResponse>({ error: 'No session token provided' }, 401);
    }

    const authService = new AuthService(db, logger);
    const result = await authService.refresh(sessionToken);

    logger.info({ userId: result.user.externalId }, 'Access token refreshed successfully');

    return c.json<AuthResponse>(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired session') {
      // Clear invalid session cookie
      setCookie(c, 'session_token', '', getClearCookieOptions());

      return c.json<ErrorResponse>({ error: 'Invalid or expired session' }, 401);
    }

    logger.error({ error }, 'Token refresh failed');
    return c.json<ErrorResponse>({ error: 'Token refresh failed' }, 500);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 */
app.post('/forgot-password', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      logger.warn({ error: jsonError }, 'Malformed JSON in forgot password request');
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = ForgotPasswordRequestSchema(body);

    if (validated instanceof type.errors) {
      logger.warn({ body, errors: validated }, 'Invalid forgot password request');
      return c.json<ErrorResponse>(
        {
          error: 'Invalid request',
          details: validated,
        },
        400,
      );
    }

    const authService = new AuthService(db, logger);
    const resetToken = await authService.forgotPassword(validated.email);

    // In a real application, you would send this token via email
    // For MVP, we'll return it in the response (NOT SECURE FOR PRODUCTION)
    logger.info({ email: validated.email }, 'Password reset requested');

    // Always return success to prevent user enumeration
    // Only include resetToken in non-production environments for testing
    const config = getConfig();
    const response: { message: string; resetToken?: string } = {
      message: 'If the email exists, a password reset link has been sent',
    };

    if (config.ENV !== 'production') {
      response.resetToken = resetToken;
    }

    return c.json(response);
  } catch (error) {
    logger.error({ error }, 'Forgot password failed');
    return c.json<ErrorResponse>({ error: 'Failed to process request' }, 500);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token
 */
app.post('/reset-password', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      logger.warn({ error: jsonError }, 'Malformed JSON in reset password request');
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = ResetPasswordRequestSchema(body);

    if (validated instanceof type.errors) {
      logger.warn({ body, errors: validated }, 'Invalid reset password request');
      return c.json<ErrorResponse>(
        {
          error: 'Invalid request',
          details: validated,
        },
        400,
      );
    }

    const authService = new AuthService(db, logger);
    await authService.resetPassword(validated.token, validated.password);

    logger.info('Password reset successfully');

    return c.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired password reset token') {
      return c.json<ErrorResponse>({ error: error.message }, 400);
    }

    logger.error({ error }, 'Password reset failed');
    return c.json<ErrorResponse>({ error: 'Password reset failed' }, 500);
  }
});

export default app;
