import {
  type AuthResponse,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
  ResetPasswordRequestSchema,
  UpdatePreferencesRequestSchema,
  type User,
  type UserPreferences,
} from '@freundebuch/shared/index.js';
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
  UserAlreadyExistsError,
  UserNotFoundError,
  ValidationError,
} from '../utils/errors.js';

const app = new Hono<AppContext>();

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post('/register', authRateLimitMiddleware, async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = RegisterRequestSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  try {
    const authService = new AuthService(db, logger);
    const result = await authService.register(validated);

    // Set session cookie (HTTP-only)
    setCookie(c, 'session_token', result.sessionToken, getSessionCookieOptions());
    // Set auth token cookie for browser requests (e.g., image loading)
    setCookie(c, AUTH_TOKEN_COOKIE, result.accessToken, getAuthTokenCookieOptions());

    logger.info({ userId: result.user.externalId }, 'User registered successfully');

    return c.json<AuthResponse>(result, 201);
  } catch (error) {
    // Check for database-level unique constraint violation (concurrent requests)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505' // PostgreSQL unique constraint violation
    ) {
      logger.warn({ error }, 'Duplicate user registration (database constraint)');
      throw new UserAlreadyExistsError();
    }

    throw error;
  }
});

/**
 * POST /api/auth/login
 * Login an existing user
 */
app.post('/login', authRateLimitMiddleware, async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = LoginRequestSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const authService = new AuthService(db, logger);
  const result = await authService.login(validated);

  // Set session cookie (HTTP-only)
  setCookie(c, 'session_token', result.sessionToken, getSessionCookieOptions());
  // Set auth token cookie for browser requests (e.g., image loading)
  setCookie(c, AUTH_TOKEN_COOKIE, result.accessToken, getAuthTokenCookieOptions());

  logger.info({ userId: result.user.externalId }, 'User logged in successfully');

  return c.json<AuthResponse>(result);
});

/**
 * POST /api/auth/logout
 * Logout the current user
 */
app.post('/logout', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const sessionToken = getCookie(c, 'session_token');

  if (!sessionToken) {
    throw new AuthenticationError('No active session');
  }

  const authService = new AuthService(db, logger);
  await authService.logout(sessionToken);

  // Clear session cookie
  setCookie(c, 'session_token', '', getClearCookieOptions());
  // Clear auth token cookie
  setCookie(c, AUTH_TOKEN_COOKIE, '', getClearCookieOptions());

  logger.info('User logged out successfully');

  return c.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/refresh
 * Refresh the access token using the session token
 */
app.post('/refresh', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  // Try to get session token from cookie first, then from body
  let sessionToken = getCookie(c, 'session_token');

  if (!sessionToken) {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ValidationError('Invalid JSON');
    }

    const validated = RefreshRequestSchema(body);

    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid request', validated);
    }

    sessionToken = validated.sessionToken;
  }

  if (!sessionToken) {
    throw new AuthenticationError('No session token provided');
  }

  try {
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
    }

    throw error;
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 */
app.post('/forgot-password', passwordResetRateLimitMiddleware, async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = ForgotPasswordRequestSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
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
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token
 */
app.post('/reset-password', passwordResetRateLimitMiddleware, async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = ResetPasswordRequestSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const authService = new AuthService(db, logger);
  await authService.resetPassword(validated.token, validated.password);

  logger.info('Password reset successfully');

  return c.json({ message: 'Password reset successfully' });
});

/**
 * GET /api/auth/me
 * Get the current authenticated user with preferences
 */
app.get('/me', authMiddleware, async (c) => {
  const db = c.get('db');

  const authUser = getAuthUser(c);

  const authService = new AuthService(db, c.get('logger'));
  const userWithPrefs = await authService.getUserWithPreferences(authUser.userId);

  if (!userWithPrefs) {
    throw new UserNotFoundError();
  }

  const response: { user: User; preferences: UserPreferences } = {
    user: {
      externalId: userWithPrefs.externalId,
      email: userWithPrefs.email,
      selfProfileId: userWithPrefs.selfProfileId,
      hasCompletedOnboarding: userWithPrefs.hasCompletedOnboarding,
    },
    preferences: userWithPrefs.preferences,
  };

  return c.json(response);
});

/**
 * PATCH /api/auth/preferences
 * Update user preferences
 */
app.patch('/preferences', authMiddleware, async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const authUser = getAuthUser(c);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = UpdatePreferencesRequestSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const authService = new AuthService(db, logger);
  const updatedPreferences = await authService.updatePreferences(authUser.userId, validated);

  logger.info({ userId: authUser.userId }, 'User preferences updated');

  return c.json<{ preferences: UserPreferences }>({ preferences: updatedPreferences });
});

export default app;
