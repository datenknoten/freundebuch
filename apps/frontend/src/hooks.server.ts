import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Initialize Sentry for server-side (SSR/prerendering)
const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// API URL for server-side calls
const API_URL = process.env.API_URL || 'http://localhost:8787';

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
async function checkOnboardingStatus(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // If check fails, assume user is onboarded (fail open for UX)
      // Backend will enforce onboarding requirement via onboardingMiddleware
      return true;
    }

    const user = await response.json();
    return user.hasCompletedOnboarding === true;
  } catch {
    // On error, assume user is onboarded (fail open for UX)
    // Backend will enforce onboarding requirement via onboardingMiddleware
    return true;
  }
}

/**
 * SvelteKit server hook to handle authentication
 * This runs on every request and protects routes that require authentication
 */
const authHandle: Handle = async ({ event, resolve }) => {
  // Get tokens from cookies
  const sessionToken = event.cookies.get('session_token');
  const accessToken = event.cookies.get('auth_token');

  // Add session token to locals for use in load functions
  event.locals.sessionToken = sessionToken || null;

  // Define protected routes that require authentication
  const protectedRoutes = ['/profile', '/friends', '/onboarding'];

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) => event.url.pathname.startsWith(route));

  // If route is protected and user is not authenticated, redirect to login
  if (isProtectedRoute && !sessionToken) {
    throw redirect(303, `/auth/login?redirect=${event.url.pathname}`);
  }

  // Define auth routes that authenticated users shouldn't access
  const authRoutes = ['/auth/login', '/auth/register'];

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some((route) => event.url.pathname.startsWith(route));

  // If user is authenticated and tries to access auth routes, redirect to home
  if (isAuthRoute && sessionToken) {
    throw redirect(303, '/');
  }

  // Check onboarding status for authenticated users on routes that require it
  // Routes exempt from onboarding check: /onboarding, /auth/*, /api/*
  const onboardingExemptRoutes = ['/onboarding', '/auth/', '/api/'];
  const requiresOnboarding =
    sessionToken &&
    accessToken &&
    !onboardingExemptRoutes.some((r) => event.url.pathname.startsWith(r));

  if (requiresOnboarding) {
    const hasCompletedOnboarding = await checkOnboardingStatus(accessToken);
    if (!hasCompletedOnboarding) {
      throw redirect(303, '/onboarding');
    }
  }

  return resolve(event);
};

// Chain Sentry handle with auth handle
export const handle = sequence(Sentry.sentryHandle(), authHandle);

export const handleError = Sentry.handleErrorWithSentry();
