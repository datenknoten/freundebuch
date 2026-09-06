import type { Context, Next } from 'hono';
import { hasSelfProfile } from '../models/queries/users.queries.js';
import { AuthenticationError, OnboardingRequiredError } from '../utils/errors.js';
import { getAuthUser } from './auth.js';

/**
 * Middleware to ensure user has completed onboarding (has a profile)
 * Apply this to routes that require onboarding to be complete.
 *
 * IMPORTANT: This middleware MUST be applied AFTER authMiddleware.
 * The authMiddleware sets the user context that this middleware reads.
 *
 * Routes that should be EXEMPT:
 * - /api/auth/* (login, register, logout)
 * - /api/users/me (get current user info including onboarding status)
 * - /api/users/me/self-profile (used during onboarding itself)
 * - /health (health checks)
 */
export async function onboardingMiddleware(c: Context, next: Next) {
  const db = c.get('db');
  const logger = c.get('logger');

  // Get authenticated user - this should always exist if authMiddleware ran first
  const authUser = getAuthUser(c);
  if (!authUser?.userId) {
    logger.error(
      'onboardingMiddleware called without authenticated user - ensure authMiddleware runs first',
    );
    throw new AuthenticationError('Unauthorized');
  }

  const result = await hasSelfProfile.run({ userExternalId: authUser.userId }, db);

  if (!result[0]?.has_self_profile) {
    logger.info({ userId: authUser.userId }, 'User has not completed onboarding');
    throw new OnboardingRequiredError();
  }

  return next();
}
