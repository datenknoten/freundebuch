import { parseWith } from '@datenknoten/kit/schema';
import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { loadServerConfig, type ServerConfig } from '$lib/server/config.js';
import { UserResponseSchema } from '$shared';

let config: ServerConfig;

export function init() {
  config = loadServerConfig();
  if (config.SENTRY_DSN !== undefined) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.NODE_ENV,
      tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  }
}

/**
 * Check if user has completed onboarding
 * Returns true if onboarded or if check fails (fail open)
 *
 * NOTE: This uses a fail-open pattern for UX reasons:
 * - The frontend check is for user experience (redirect before hitting API)
 * - The backend ALWAYS enforces onboarding via onboardingMiddleware (returns 403)
 * - If this check fails (network error, backend down), users can proceed but
 *   will be blocked by the backend API which is the authoritative enforcement
 * - This prevents users from being locked out during temporary outages
 */
async function checkOnboardingStatus(apiUrl: string, cookie: string) {
  try {
    const response = await fetch(`${apiUrl}/api/users/me`, {
      headers: {
        Cookie: cookie,
      },
    });

    if (response.ok === false) {
      // If check fails, assume user is onboarded (fail open for UX)
      return true;
    }

    const user = parseWith(UserResponseSchema, await response.json());
    return user.hasCompletedOnboarding === true;
  } catch {
    // On error, assume user is onboarded (fail open for UX)
    return true;
  }
}

/**
 * SvelteKit server hook to handle authentication
 * This runs on every request and protects routes that require authentication
 *
 * Better Auth manages sessions via cookies. We check for the presence of
 * Better Auth's session cookie to determine authentication state.
 */
const authHandle: Handle = async ({ event, resolve }) => {
  event.locals.config = config;

  // Better Auth session cookie name
  const sessionCookie =
    event.cookies.get('better-auth.session_token') ||
    event.cookies.get('__Secure-better-auth.session_token');
  const hasSession = !!sessionCookie;

  // Define protected routes that require authentication
  const protectedRoutes = ['/profile', '/friends', '/onboarding'];

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) => event.url.pathname.startsWith(route));

  // If route is protected and user is not authenticated, redirect to login
  if (isProtectedRoute && !hasSession) {
    throw redirect(303, `/auth/login?redirect=${event.url.pathname}`);
  }

  // Define auth routes that authenticated users shouldn't access
  const authRoutes = ['/auth/login', '/auth/register'];

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some((route) => event.url.pathname.startsWith(route));

  // If user is authenticated and tries to access auth routes, redirect to home
  if (isAuthRoute && hasSession) {
    throw redirect(303, '/');
  }

  // Check onboarding status for authenticated users on routes that require it
  // Routes exempt from onboarding check: /onboarding, /auth/, /api/
  const onboardingExemptRoutes = ['/onboarding', '/auth/', '/api/'];
  const requiresOnboarding =
    hasSession && !onboardingExemptRoutes.some((r) => event.url.pathname.startsWith(r));

  if (requiresOnboarding) {
    // Forward all cookies to the backend for session-based auth
    const cookieHeader = event.request.headers.get('cookie') || '';
    const hasCompletedOnboarding = await checkOnboardingStatus(
      event.locals.config.API_URL,
      cookieHeader,
    );
    if (!hasCompletedOnboarding) {
      throw redirect(303, '/onboarding');
    }
  }

  return resolve(event);
};

// Chain Sentry handle with auth handle
export const handle = sequence(Sentry.sentryHandle(), authHandle);

export const handleError = Sentry.handleErrorWithSentry();
