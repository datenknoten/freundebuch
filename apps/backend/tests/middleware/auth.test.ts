import { handleError } from '@datenknoten/kit/http';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type pg from 'pg';
import pino from 'pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from '../../src/lib/auth.js';
import { authMiddleware, getAuthUser } from '../../src/middleware/auth.js';
import type { AppContext } from '../../src/types/context.js';

// Untyped: the fixtures carry the full Better Auth session, wider than AuthSession.
const mockGetSession = vi.fn();

const FAKE_AUTH: Auth = {
  handler: vi.fn<Auth['handler']>(),
  api: {
    getSession: mockGetSession,
    listPasskeys: vi.fn<Auth['api']['listPasskeys']>(),
    getMcpSession: vi.fn<Auth['api']['getMcpSession']>(),
  },
};

describe('authMiddleware', () => {
  let app: Hono<AppContext>;

  beforeEach(() => {
    app = new Hono<AppContext>();
    vi.clearAllMocks();

    // Setup db context and test route with auth middleware
    app.use('/protected/*', async (c, next) => {
      c.set('db', {} as unknown as pg.Pool); // mock db pool
      c.set('auth', FAKE_AUTH);
      return next();
    });
    app.use('/protected/*', authMiddleware);
    app.get('/protected/resource', (c) => {
      const user = getAuthUser(c);
      return c.json({ message: 'success', user });
    });

    // Add error handler to match production behavior
    app.onError((err, c) => {
      const { status, body } = handleError(err, pino({ level: 'silent' }));
      // handleError only answers with statuses that carry a body.
      return c.json(body, status as ContentfulStatusCode);
    });
  });

  describe('valid session authentication', () => {
    it('should allow access with valid session', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
        session: { id: 'session-1', userId: 'user-123', token: 'tok' },
      });

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        message: 'success',
        user: { userId: 'user-123', email: 'test@example.com' },
      });
    });

    it('should set user context correctly', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-456', email: 'another@example.com', name: 'Another' },
        session: { id: 'session-2', userId: 'user-456', token: 'tok' },
      });

      const res = await app.request('/protected/resource');
      const body = (await res.json()) as { user: unknown };
      expect(body.user).toEqual({
        userId: 'user-456',
        email: 'another@example.com',
      });
    });
  });

  describe('missing or invalid session', () => {
    it('should return 401 when no session exists', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    });

    it('should return 401 when getSession returns null', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
    });
  });

  describe('getAuthUser helper', () => {
    it('should return user from context when authenticated', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-999', email: 'helper@example.com', name: 'Helper' },
        session: { id: 'session-3', userId: 'user-999', token: 'tok' },
      });

      const res = await app.request('/protected/resource');
      const body = (await res.json()) as { user: unknown };
      expect(body.user).toEqual({
        userId: 'user-999',
        email: 'helper@example.com',
      });
    });

    it('should return correct user for different authenticated requests', async () => {
      const user1 = { id: 'user-1', email: 'user1@example.com', name: 'User1' };
      const user2 = { id: 'user-2', email: 'user2@example.com', name: 'User2' };

      // First request
      mockGetSession.mockResolvedValue({
        user: user1,
        session: { id: 's1', userId: 'user-1', token: 'tok' },
      });
      const res1 = await app.request('/protected/resource');
      const body1 = (await res1.json()) as { user: { userId: string } };
      expect(body1.user.userId).toBe('user-1');

      // Second request
      mockGetSession.mockResolvedValue({
        user: user2,
        session: { id: 's2', userId: 'user-2', token: 'tok' },
      });
      const res2 = await app.request('/protected/resource');
      const body2 = (await res2.json()) as { user: { userId: string } };
      expect(body2.user.userId).toBe('user-2');
    });
  });

  describe('middleware chaining', () => {
    it('should call next() and continue to route handler on success', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-chain', email: 'chain@example.com', name: 'Chain' },
        session: { id: 's1', userId: 'user-chain', token: 'tok' },
      });

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { message: unknown };
      expect(body.message).toBe('success');
    });

    it('should not call next() when authentication fails', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
      const body = (await res.json()) as { message: unknown };
      expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      expect(body.message).toBeUndefined();
    });
  });
});
