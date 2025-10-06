import type { Context, Next } from 'hono';
import { verifyToken } from '../utils/auth.ts';

export interface AuthContext {
  userId: string;
  email: string;
}

/**
 * Middleware to authenticate requests using JWT
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
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
