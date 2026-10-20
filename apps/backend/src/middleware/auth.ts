import type { Context, Next } from 'hono';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { Auth } from '../lib/auth.js';
import type { AppContext } from '../types/context.js';

export interface AuthContext {
  /**
   * The user's single identity: `auth."user".id`, which equals
   * `auth.users.external_id` (see ADR 0003). Domain queries join
   * `auth.users` on it; `auth."user"` queries use it directly.
   */
  userId: string;
  email: string;
}

export interface AuthMiddlewareOptions {
  auth: Auth;
}

/**
 * Stores the full Better Auth session in context so handlers don't need a
 * second lookup. The session's user id *is* the domain user id, so there is
 * no per-request lookup to translate between identity tables.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  const { auth } = options;

  return async function authMiddleware(c: Context<AppContext>, next: Next) {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session === null) {
      throw new AuthenticationError('Unauthorized');
    }

    c.set('user', {
      userId: session.user.id,
      email: session.user.email,
    });

    // Handlers read selfProfileId, preferences, etc. from here instead of a
    // redundant getSession() call
    c.set('session', session);

    return next();
  };
}

export function getAuthUser(c: Context<AppContext>) {
  return c.get('user');
}
