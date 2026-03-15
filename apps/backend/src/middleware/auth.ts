import type { Context, Next } from 'hono';
import { getAuth } from '../lib/auth.js';
import { getLegacyExternalIdByEmail } from '../models/queries/users.queries.js';
import { AuthenticationError } from '../utils/errors.js';

export interface AuthContext {
  /** Legacy auth.users.external_id (UUID) — used by domain queries (friends, circles, etc.) */
  userId: string;
  /** Better Auth user.id (opaque string) — used by auth."user" queries (self-profile, preferences) */
  betterAuthId: string;
  email: string;
}

/**
 * Middleware to authenticate requests using Better Auth sessions.
 * Validates the session cookie via Better Auth's API and stores the
 * full session in context so handlers don't need a second lookup.
 *
 * Resolves both the Better Auth user ID and the legacy auth.users
 * external_id, since domain queries (friends, encounters, etc.)
 * reference auth.users.external_id which is UUID-typed.
 */
export async function authMiddleware(c: Context, next: Next) {
  const session = await getAuth().api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    throw new AuthenticationError('Unauthorized');
  }

  // Resolve the legacy auth.users.external_id from the email.
  // Better Auth user IDs are opaque strings, but domain tables
  // (friends, encounters, etc.) join via auth.users.external_id (UUID).
  const db = c.get('db');
  const [legacyUser] = await getLegacyExternalIdByEmail.run({ email: session.user.email }, db);

  if (!legacyUser) {
    throw new AuthenticationError('User account not fully provisioned');
  }

  c.set('user', {
    userId: legacyUser.external_id,
    betterAuthId: session.user.id,
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
