import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authMiddleware, getAuthUser } from '../../src/middleware/auth.js';
import type { AppContext } from '../../src/types/context.js';
import { isAppError } from '../../src/utils/errors.js';

const mockGetSession = vi.fn();
const mockGetLegacyExternalId = vi.fn();

// Mock the Better Auth module
vi.mock('../../src/lib/auth.ts', () => ({
  getAuth: () => ({
    api: {
      getSession: mockGetSession,
    },
  }),
}));

// Mock the legacy external ID lookup
vi.mock('../../src/models/queries/users.queries.ts', () => ({
  getLegacyExternalIdByEmail: {
    run: (...args: unknown[]) => mockGetLegacyExternalId(...args),
  },
}));

describe('authMiddleware', () => {
  let app: Hono<AppContext>;

  beforeEach(() => {
    app = new Hono<AppContext>();
    vi.clearAllMocks();

    // Setup db context and test route with auth middleware
    app.use('/protected/*', async (c, next) => {
      c.set('db', {} as any); // mock db pool
      return next();
    });
    app.use('/protected/*', authMiddleware);
    app.get('/protected/resource', (c) => {
      const user = getAuthUser(c);
      return c.json({ message: 'success', user });
    });

    // Add error handler to match production behavior
    app.onError((err, c) => {
      if (isAppError(err)) {
        return c.json({ error: err.message }, err.statusCode);
      }
      return c.json({ error: 'Internal Server Error' }, 500);
    });
  });

  describe('valid session authentication', () => {
    it('should allow access with valid session', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
        session: { id: 'session-1', userId: 'user-123', token: 'tok' },
      });
      mockGetLegacyExternalId.mockResolvedValue([{ external_id: 'legacy-uuid-123' }]);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({
        message: 'success',
        user: { userId: 'legacy-uuid-123', betterAuthId: 'user-123', email: 'test@example.com' },
      });
    });

    it('should set user context correctly', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-456', email: 'another@example.com', name: 'Another' },
        session: { id: 'session-2', userId: 'user-456', token: 'tok' },
      });
      mockGetLegacyExternalId.mockResolvedValue([{ external_id: 'legacy-uuid-456' }]);

      const res = await app.request('/protected/resource');
      const body = (await res.json()) as { user: unknown };
      expect(body.user).toEqual({
        userId: 'legacy-uuid-456',
        betterAuthId: 'user-456',
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
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when getSession returns null', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
    });

    it('should return 401 when legacy user does not exist', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-new', email: 'new@example.com', name: 'New' },
        session: { id: 's1', userId: 'user-new', token: 'tok' },
      });
      mockGetLegacyExternalId.mockResolvedValue([]);

      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'User account not fully provisioned' });
    });
  });

  describe('getAuthUser helper', () => {
    it('should return user from context when authenticated', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-999', email: 'helper@example.com', name: 'Helper' },
        session: { id: 'session-3', userId: 'user-999', token: 'tok' },
      });
      mockGetLegacyExternalId.mockResolvedValue([{ external_id: 'legacy-uuid-999' }]);

      const res = await app.request('/protected/resource');
      const body = (await res.json()) as { user: unknown };
      expect(body.user).toEqual({
        userId: 'legacy-uuid-999',
        betterAuthId: 'user-999',
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
      mockGetLegacyExternalId.mockResolvedValue([{ external_id: 'legacy-uuid-1' }]);
      const res1 = await app.request('/protected/resource');
      const body1 = (await res1.json()) as { user: { userId: string } };
      expect(body1.user.userId).toBe('legacy-uuid-1');

      // Second request
      mockGetSession.mockResolvedValue({
        user: user2,
        session: { id: 's2', userId: 'user-2', token: 'tok' },
      });
      mockGetLegacyExternalId.mockResolvedValue([{ external_id: 'legacy-uuid-2' }]);
      const res2 = await app.request('/protected/resource');
      const body2 = (await res2.json()) as { user: { userId: string } };
      expect(body2.user.userId).toBe('legacy-uuid-2');
    });
  });

  describe('middleware chaining', () => {
    it('should call next() and continue to route handler on success', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-chain', email: 'chain@example.com', name: 'Chain' },
        session: { id: 's1', userId: 'user-chain', token: 'tok' },
      });
      mockGetLegacyExternalId.mockResolvedValue([{ external_id: 'legacy-uuid-chain' }]);

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
      expect(body).toEqual({ error: 'Unauthorized' });
      expect(body.message).toBeUndefined();
    });
  });
});
