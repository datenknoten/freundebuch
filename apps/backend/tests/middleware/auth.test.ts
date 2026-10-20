import { handleError } from '@datenknoten/kit/http';
import { parseWith } from '@datenknoten/kit/schema';
import { ErrorResponseSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { type Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from '../../src/lib/auth.js';
import { createAuthMiddleware, getAuthUser } from '../../src/middleware/auth.js';
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

const ProtectedResourceSchema = type({
  message: 'string',
  user: { userId: 'string', email: 'string' },
});

function renderError(err: Error, c: Context<AppContext>) {
  const { status, body } = handleError(err, pino({ level: 'silent' }));
  // handleError only answers with statuses that carry a body.
  return c.json(body, status as ContentfulStatusCode);
}

describe('createAuthMiddleware', () => {
  let app: Hono<AppContext>;

  beforeEach(() => {
    app = new Hono<AppContext>();
    vi.clearAllMocks();

    app.use('/protected/*', createAuthMiddleware({ auth: FAKE_AUTH }));
    app.get('/protected/resource', (c) => {
      const user = getAuthUser(c);
      return c.json({ message: 'success', user });
    });

    app.onError(renderError);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('valid session authentication', () => {
    it('lets the request through to the route', async () => {
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

    it('exposes the id and email of the session user to the route', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-456', email: 'another@example.com', name: 'Another' },
        session: { id: 'session-2', userId: 'user-456', token: 'tok' },
      });

      const res = await app.request('/protected/resource');
      const body = parseWith(ProtectedResourceSchema, await res.json());
      expect(body.user).toEqual({
        userId: 'user-456',
        email: 'another@example.com',
      });
    });
  });

  describe('missing or invalid session', () => {
    it('answers 401 with the UNAUTHORIZED error body', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    });

    it('answers 401 when getSession resolves to null', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
    });
  });

  describe('getAuthUser', () => {
    it('returns the authenticated user from the context', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-999', email: 'helper@example.com', name: 'Helper' },
        session: { id: 'session-3', userId: 'user-999', token: 'tok' },
      });

      const res = await app.request('/protected/resource');
      const body = parseWith(ProtectedResourceSchema, await res.json());
      expect(body.user).toEqual({
        userId: 'user-999',
        email: 'helper@example.com',
      });
    });

    it('returns the user of each request', async () => {
      const user1 = { id: 'user-1', email: 'user1@example.com', name: 'User1' };
      const user2 = { id: 'user-2', email: 'user2@example.com', name: 'User2' };

      // First request
      mockGetSession.mockResolvedValue({
        user: user1,
        session: { id: 's1', userId: 'user-1', token: 'tok' },
      });
      const res1 = await app.request('/protected/resource');
      const body1 = parseWith(ProtectedResourceSchema, await res1.json());
      expect(body1.user.userId).toBe('user-1');

      // Second request
      mockGetSession.mockResolvedValue({
        user: user2,
        session: { id: 's2', userId: 'user-2', token: 'tok' },
      });
      const res2 = await app.request('/protected/resource');
      const body2 = parseWith(ProtectedResourceSchema, await res2.json());
      expect(body2.user.userId).toBe('user-2');
    });
  });

  describe('middleware chaining', () => {
    it('continues to the route handler on success', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-chain', email: 'chain@example.com', name: 'Chain' },
        session: { id: 's1', userId: 'user-chain', token: 'tok' },
      });

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(200);
      const body = parseWith(ProtectedResourceSchema, await res.json());
      expect(body.message).toBe('success');
    });

    it('stops before the route handler when authentication fails', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
      const body = parseWith(ErrorResponseSchema, await res.json());
      expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    });
  });
});
