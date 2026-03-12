import { Hono } from 'hono';
import type { Pool } from 'pg';
import pino from 'pino';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '../types/context.js';
import { isAppError } from '../utils/errors.js';

const mockGetSession = vi.fn();
const mockHandler = vi.fn();

// Mock the Better Auth module
vi.mock('../lib/auth.ts', () => ({
  getAuth: () => ({
    api: {
      getSession: mockGetSession,
    },
    handler: mockHandler,
  }),
}));

import authRoutes from './auth.js';

// These tests validate the auth route structure and custom endpoints (/me, /preferences).
// Better Auth handler endpoints (sign-up, sign-in, sign-out, etc.) are tested
// via integration tests that run against a real database.

describe('Auth Routes', () => {
  let app: Hono<AppContext>;
  let mockDb: Pool;
  let logger: pino.Logger;

  beforeAll(() => {
    app = new Hono<AppContext>();
    mockDb = {} as Pool;
    logger = pino({ level: 'silent' });

    app.use('*', async (c, next) => {
      c.set('db', mockDb);
      c.set('logger', logger);
      await next();
    });

    app.route('/api/auth', authRoutes);

    app.onError((err, c) => {
      if (isAppError(err)) {
        return c.json({ error: err.message }, err.statusCode);
      }
      return c.json({ error: 'Internal Server Error' }, 500);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/api/auth/me');

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('PATCH /api/auth/preferences', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Better Auth handler delegation', () => {
    it('should delegate non-custom paths to Better Auth handler', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      mockHandler.mockResolvedValue(mockResponse);

      const res = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });

      expect(mockHandler).toHaveBeenCalled();
      expect(res.status).toBe(200);
    });
  });
});
