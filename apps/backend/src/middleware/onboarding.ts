import type { Context, MiddlewareHandler, Next } from 'hono';
import { AuthenticationError } from '../errors/authentication.error.js';
import { OnboardingRequiredError } from '../errors/onboarding-required.error.js';
import type { UsersService } from '../services/users.service.js';
import type { AppContext } from '../types/context.js';
import { getAuthUser } from './auth.js';

export interface OnboardingMiddlewareOptions {
  usersService: UsersService;
}

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
export function createOnboardingMiddleware(
  options: OnboardingMiddlewareOptions,
): MiddlewareHandler<AppContext> {
  const { usersService } = options;

  return async function onboardingMiddleware(c: Context<AppContext>, next: Next) {
    const logger = c.get('logger');

    // Get authenticated user - this should always exist if authMiddleware ran first
    const authUser = getAuthUser(c);
    if (!authUser?.userId) {
      logger.error(
        'onboardingMiddleware called without authenticated user - ensure authMiddleware runs first',
      );
      throw new AuthenticationError('Unauthorized');
    }

    if (!(await usersService.hasSelfProfile(authUser.userId))) {
      logger.info({ userId: authUser.userId }, 'User has not completed onboarding');
      throw new OnboardingRequiredError();
    }

    return next();
  };
}
