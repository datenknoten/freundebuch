import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../utils/auth.js';

export interface AuthContext {
  userId: string;
  email: string;
}

/**
 * Cookie name for the JWT auth token
 */
export const AUTH_TOKEN_COOKIE = 'auth_token';

/**
 * Middleware to authenticate requests using JWT
 * Checks Authorization header first, then falls back to auth_token cookie
 * (cookie fallback is needed for browser image requests which can't set headers)
 */
export async function authMiddleware(c: Context, next: Next) {
  let token: string | undefined;

  // First, try Authorization header
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Fall back to cookie if no Authorization header
  if (!token) {
    token = getCookie(c, AUTH_TOKEN_COOKIE);
  }

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload = verifyToken(token);

  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Add user info to context
  c.set('user', payload);

  return next();
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): AuthContext {
  return c.get('user');
}
