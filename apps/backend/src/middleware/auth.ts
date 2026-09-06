import type { Context, Next } from 'hono';
import { getAuth } from '../lib/auth.js';
import type { AppContext } from '../types/context.js';
import { AuthenticationError } from '../utils/errors.js';

/** The Better Auth session as returned by api.getSession (non-null). */
export type AuthSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>>
>;

export interface AuthContext {
  /**
   * The user's single identity: `auth."user".id`, which equals
   * `auth.users.external_id` (see ADR 0003). Domain queries join
   * `auth.users` on it; `auth."user"` queries use it directly.
   */
  userId: string;
  email: string;
}

/**
 * Middleware to authenticate requests using Better Auth sessions.
 * Validates the session cookie via Better Auth's API and stores the
 * full session in context so handlers don't need a second lookup.
 *
 * The session's user id *is* the domain user id, so there is no per-request
 * lookup to translate between identity tables.
 */
export async function authMiddleware(c: Context<AppContext>, next: Next) {
  const session = await getAuth().api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    throw new AuthenticationError('Unauthorized');
  }

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
export function getAuthUser(c: Context<AppContext>): AuthContext {
  return c.get('user');
}

/**
 * Get the full Better Auth session from context (set by authMiddleware).
 */
export function getAuthSession(c: Context<AppContext>) {
  return c.get('session');
}
