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
 * Better Auth manages sessions via cookies, so the presence of its session cookie decides the
 * authentication state here.
 */
async function authHandle({ event, resolve }: Parameters<Handle>[0]) {
  event.locals.config = config;

  const sessionToken = event.cookies.get('better-auth.session_token');
  const secureSessionToken = event.cookies.get('__Secure-better-auth.session_token');
  const hasSession =
    (sessionToken !== undefined && sessionToken !== '') ||
    (secureSessionToken !== undefined && secureSessionToken !== '');

  const protectedRoutes = ['/profile', '/friends', '/onboarding'];
  const isProtectedRoute = protectedRoutes.some((route) => event.url.pathname.startsWith(route));
  if (isProtectedRoute === true && hasSession === false) {
    throw redirect(303, `/auth/login?redirect=${event.url.pathname}`);
  }

  const authRoutes = ['/auth/login', '/auth/register'];
  const isAuthRoute = authRoutes.some((route) => event.url.pathname.startsWith(route));
  if (isAuthRoute === true && hasSession === true) {
    throw redirect(303, '/');
  }

  const onboardingExemptRoutes = ['/onboarding', '/auth/', '/api/'];
  const isOnboardingExempt = onboardingExemptRoutes.some((r) => event.url.pathname.startsWith(r));

  if (hasSession === true && isOnboardingExempt === false) {
    const cookieHeader = event.request.headers.get('cookie') ?? '';
    const hasCompletedOnboarding = await checkOnboardingStatus(
      event.locals.config.API_URL,
      cookieHeader,
    );
    if (hasCompletedOnboarding === false) {
      throw redirect(303, '/onboarding');
    }
  }

  return resolve(event);
}

// Sentry's handle runs first so it traces the auth redirects.
export const handle = sequence(Sentry.sentryHandle(), authHandle);

export const handleError = Sentry.handleErrorWithSentry();
