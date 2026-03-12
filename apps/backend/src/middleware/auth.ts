import type { Context, Next } from 'hono';
import { getAuth } from '../lib/auth.js';
import { AuthenticationError } from '../utils/errors.js';

export interface AuthContext {
  userId: string;
  email: string;
}

/**
 * Middleware to authenticate requests using Better Auth sessions.
 * Validates the session cookie via Better Auth's API and stores the
 * full session in context so handlers don't need a second lookup.
 */
export async function authMiddleware(c: Context, next: Next) {
  const session = await getAuth().api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    throw new AuthenticationError('Unauthorized');
  }

  // Set user info to context (matching existing AuthContext shape)
  c.set('user', {
    userId: session.user.id,
    email: session.user.email,
  });

  // Store full session so handlers can access selfProfileId, preferences, etc.
  // without a redundant getSession() call
  c.set('session', session);

  return next();
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): AuthContext {
  return c.get('user');
}

/**
 * Get the full Better Auth session from context (set by authMiddleware).
 */
export function getAuthSession(c: Context) {
  return c.get('session');
}
