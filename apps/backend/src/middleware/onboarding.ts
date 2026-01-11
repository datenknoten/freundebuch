import type { Context, Next } from 'hono';
import { hasSelfContact } from '../models/queries/users.queries.js';
import { getAuthUser } from './auth.js';

/**
 * Error code returned when user hasn't completed onboarding
 */
export const ONBOARDING_REQUIRED_CODE = 'ONBOARDING_REQUIRED';

/**
 * Middleware to ensure user has completed onboarding (has a self-contact)
 * Apply this to routes that require onboarding to be complete.
 *
 * IMPORTANT: This middleware MUST be applied AFTER authMiddleware.
 * The authMiddleware sets the user context that this middleware reads.
 *
 * Routes that should be EXEMPT:
 * - /api/auth/* (login, register, logout)
 * - /api/users/me (get current user info including onboarding status)
 * - /api/users/me/self-contact (used during onboarding itself)
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
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const result = await hasSelfContact.run({ userExternalId: authUser.userId }, db);

    if (!result[0]?.has_self_contact) {
      logger.info({ userId: authUser.userId }, 'User has not completed onboarding');
      return c.json(
        {
          error: 'Onboarding required',
          code: ONBOARDING_REQUIRED_CODE,
          message: 'Please complete your profile setup before using this feature',
        },
        403,
      );
    }

    return next();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to check onboarding status');
    return c.json({ error: 'Internal server error' }, 500);
  }
}
