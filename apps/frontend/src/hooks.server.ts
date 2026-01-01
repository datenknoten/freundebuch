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

/**
 * SvelteKit server hook to handle authentication
 * This runs on every request and protects routes that require authentication
 */
const authHandle: Handle = async ({ event, resolve }) => {
  // Get session token from cookies
  const sessionToken = event.cookies.get('session_token');

  // Add session token to locals for use in load functions
  event.locals.sessionToken = sessionToken || null;

  // Define protected routes that require authentication
  const protectedRoutes = ['/profile'];

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

  return resolve(event);
};

// Chain Sentry handle with auth handle
export const handle = sequence(Sentry.sentryHandle(), authHandle);

export const handleError = Sentry.handleErrorWithSentry();
