import {
  type AuthResponse,
  type ErrorResponse,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
  ResetPasswordRequestSchema,
  UpdatePreferencesRequestSchema,
  type User,
  type UserPreferences,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { AUTH_TOKEN_COOKIE, authMiddleware, getAuthUser } from '../middleware/auth.js';
import {
  authRateLimitMiddleware,
  passwordResetRateLimitMiddleware,
} from '../middleware/rate-limit.js';
import { AuthService } from '../services/auth.service.js';
import type { AppContext } from '../types/context.js';
import {
  getAuthTokenCookieOptions,
  getClearCookieOptions,
  getSessionCookieOptions,
} from '../utils/auth.js';
import { getConfig } from '../utils/config.js';
import {
  AuthenticationError,
  InvalidSessionError,
  InvalidTokenError,
  isAppError,
  UserAlreadyExistsError,
} from '../utils/errors.js';

const app = new Hono<AppContext>();

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post('/register', authRateLimitMiddleware, async (c) => {
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
    // Set auth token cookie for browser requests (e.g., image loading)
    setCookie(c, AUTH_TOKEN_COOKIE, result.accessToken, getAuthTokenCookieOptions());

    logger.info({ userId: result.user.externalId }, 'User registered successfully');

    return c.json<AuthResponse>(result, 201);
  } catch (error) {
    // Check for application-level duplicate user error
    if (error instanceof UserAlreadyExistsError) {
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
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

    // Handle other AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Registration failed');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Registration failed');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Registration failed' }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login an existing user
 */
app.post('/login', authRateLimitMiddleware, async (c) => {
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
    // Set auth token cookie for browser requests (e.g., image loading)
    setCookie(c, AUTH_TOKEN_COOKIE, result.accessToken, getAuthTokenCookieOptions());

    logger.info({ userId: result.user.externalId }, 'User logged in successfully');

    return c.json<AuthResponse>(result);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return c.json<ErrorResponse>({ error: 'Invalid credentials' }, error.statusCode);
    }

    // Handle other AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Login failed');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Login failed');
    Sentry.captureException(err);
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
    // Clear auth token cookie
    setCookie(c, AUTH_TOKEN_COOKIE, '', getClearCookieOptions());

    logger.info('User logged out successfully');

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Logout failed');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Logout failed');
    Sentry.captureException(err);
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

    // Update auth token cookie with refreshed token
    setCookie(c, AUTH_TOKEN_COOKIE, result.accessToken, getAuthTokenCookieOptions());

    logger.info({ userId: result.user.externalId }, 'Access token refreshed successfully');

    return c.json<AuthResponse>(result);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      // Clear invalid session and auth cookies
      setCookie(c, 'session_token', '', getClearCookieOptions());
      setCookie(c, AUTH_TOKEN_COOKIE, '', getClearCookieOptions());

      return c.json<ErrorResponse>({ error: 'Invalid or expired session' }, error.statusCode);
    }

    // Handle other AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Token refresh failed');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Token refresh failed');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Token refresh failed' }, 500);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 */
app.post('/forgot-password', passwordResetRateLimitMiddleware, async (c) => {
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
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Forgot password failed');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Forgot password failed');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to process request' }, 500);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token
 */
app.post('/reset-password', passwordResetRateLimitMiddleware, async (c) => {
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
    if (error instanceof InvalidTokenError) {
      return c.json<ErrorResponse>({ error: error.message }, 400);
    }

    // Handle other AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Password reset failed');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Password reset failed');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Password reset failed' }, 500);
  }
});

/**
 * GET /api/auth/me
 * Get the current authenticated user with preferences
 */
app.get('/me', authMiddleware, async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);

    const authService = new AuthService(db, logger);
    const userWithPrefs = await authService.getUserWithPreferences(authUser.userId);

    if (!userWithPrefs) {
      return c.json<ErrorResponse>({ error: 'User not found' }, 404);
    }

    const response: { user: User; preferences: UserPreferences } = {
      user: {
        externalId: userWithPrefs.externalId,
        email: userWithPrefs.email,
        selfContactId: userWithPrefs.selfContactId,
        hasCompletedOnboarding: userWithPrefs.hasCompletedOnboarding,
      },
      preferences: userWithPrefs.preferences,
    };

    return c.json(response);
  } catch (error) {
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get user');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to get user');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get user' }, 500);
  }
});

/**
 * PATCH /api/auth/preferences
 * Update user preferences
 */
app.patch('/preferences', authMiddleware, async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      logger.warn({ error: jsonError }, 'Malformed JSON in preferences update request');
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = UpdatePreferencesRequestSchema(body);

    if (validated instanceof type.errors) {
      logger.warn({ body, errors: validated }, 'Invalid preferences update request');
      return c.json<ErrorResponse>(
        {
          error: 'Invalid request',
          details: validated,
        },
        400,
      );
    }

    const authService = new AuthService(db, logger);
    const updatedPreferences = await authService.updatePreferences(authUser.userId, validated);

    logger.info({ userId: authUser.userId }, 'User preferences updated');

    return c.json<{ preferences: UserPreferences }>({ preferences: updatedPreferences });
  } catch (error) {
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update preferences');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to update preferences');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update preferences' }, 500);
  }
});

export default app;
