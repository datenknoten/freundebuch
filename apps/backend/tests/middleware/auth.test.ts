import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authMiddleware, getAuthUser } from '../../src/middleware/auth.ts';
import * as auth from '../../src/utils/auth.ts';

// Mock the auth utility
vi.mock('../../src/utils/auth.ts', () => ({
  verifyToken: vi.fn(),
}));

describe('authMiddleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    vi.clearAllMocks();

    // Setup test route with auth middleware
    app.use('/protected/*', authMiddleware);
    app.get('/protected/resource', (c) => {
      const user = getAuthUser(c);
      return c.json({ message: 'success', user });
    });
  });

  describe('valid JWT token authentication', () => {
    it('should allow access with valid Bearer token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockReturnValue(mockPayload);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer valid.jwt.token',
        },
      });

      expect(res.status).toBe(200);
      expect(auth.verifyToken).toHaveBeenCalledWith('valid.jwt.token');

      const body = await res.json();
      expect(body).toEqual({
        message: 'success',
        user: mockPayload,
      });
    });

    it('should set user context correctly', async () => {
      const mockPayload = {
        userId: 'user-456',
        email: 'another@example.com',
      };

      vi.mocked(auth.verifyToken).mockReturnValue(mockPayload);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer another.valid.token',
        },
      });

      const body = (await res.json()) as { user: unknown };
      expect(body.user).toEqual(mockPayload);
    });

    it('should handle tokens with extra spaces in Bearer prefix', async () => {
      const mockPayload = {
        userId: 'user-789',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockReturnValue(mockPayload);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer  token.with.spaces',
        },
      });

      expect(res.status).toBe(200);
      expect(auth.verifyToken).toHaveBeenCalledWith(' token.with.spaces');
    });
  });

  describe('missing Authorization header', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
      expect(auth.verifyToken).not.toHaveBeenCalled();

      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when Authorization header is empty string', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: '',
        },
      });

      expect(res.status).toBe(401);
      expect(auth.verifyToken).not.toHaveBeenCalled();

      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('malformed Authorization header', () => {
    it('should return 401 when header does not start with "Bearer "', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Token abc123',
        },
      });

      expect(res.status).toBe(401);
      expect(auth.verifyToken).not.toHaveBeenCalled();

      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when header is just "Bearer" without token', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer',
        },
      });

      expect(res.status).toBe(401);
      expect(auth.verifyToken).not.toHaveBeenCalled();

      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when header is lowercase "bearer"', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'bearer token123',
        },
      });

      expect(res.status).toBe(401);
      expect(auth.verifyToken).not.toHaveBeenCalled();

      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when header is just the token without Bearer prefix', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'just.a.token',
        },
      });

      expect(res.status).toBe(401);
      expect(auth.verifyToken).not.toHaveBeenCalled();

      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when header has wrong spacing "Bearer  token"', async () => {
      // This test documents current behavior - "Bearer " with no space after returns 401
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'BearerNoSpace',
        },
      });

      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('invalid/expired tokens', () => {
    it('should return 401 when token verification returns null', async () => {
      vi.mocked(auth.verifyToken).mockReturnValue(null);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer invalid.token',
        },
      });

      expect(res.status).toBe(401);
      expect(auth.verifyToken).toHaveBeenCalledWith('invalid.token');

      const body = await res.json();
      expect(body).toEqual({ error: 'Invalid or expired token' });
    });

    it('should return 401 for expired token', async () => {
      vi.mocked(auth.verifyToken).mockReturnValue(null);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer expired.jwt.token',
        },
      });

      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body).toEqual({ error: 'Invalid or expired token' });
    });

    it('should return 401 for malformed token', async () => {
      vi.mocked(auth.verifyToken).mockReturnValue(null);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer malformed',
        },
      });

      expect(res.status).toBe(401);
      expect(auth.verifyToken).toHaveBeenCalledWith('malformed');

      const body = await res.json();
      expect(body).toEqual({ error: 'Invalid or expired token' });
    });

    it('should return 401 for token with invalid signature', async () => {
      vi.mocked(auth.verifyToken).mockReturnValue(null);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer token.with.invalid.signature',
        },
      });

      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body).toEqual({ error: 'Invalid or expired token' });
    });
  });

  describe('getAuthUser helper', () => {
    it('should return user from context when authenticated', async () => {
      const mockPayload = {
        userId: 'user-999',
        email: 'helper@example.com',
      };

      vi.mocked(auth.verifyToken).mockReturnValue(mockPayload);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer valid.token',
        },
      });

      const body = (await res.json()) as { user: unknown };
      expect(body.user).toEqual(mockPayload);
    });

    it('should return correct user for different authenticated requests', async () => {
      const user1 = { userId: 'user-1', email: 'user1@example.com' };
      const user2 = { userId: 'user-2', email: 'user2@example.com' };

      // First request
      vi.mocked(auth.verifyToken).mockReturnValue(user1);
      const res1 = await app.request('/protected/resource', {
        headers: { Authorization: 'Bearer token1' },
      });
      const body1 = (await res1.json()) as { user: unknown };
      expect(body1.user).toEqual(user1);

      // Second request
      vi.mocked(auth.verifyToken).mockReturnValue(user2);
      const res2 = await app.request('/protected/resource', {
        headers: { Authorization: 'Bearer token2' },
      });
      const body2 = (await res2.json()) as { user: unknown };
      expect(body2.user).toEqual(user2);
    });
  });

  describe('middleware chaining', () => {
    it('should call next() and continue to route handler on success', async () => {
      const mockPayload = {
        userId: 'user-chain',
        email: 'chain@example.com',
      };

      vi.mocked(auth.verifyToken).mockReturnValue(mockPayload);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer valid.token',
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { message: unknown };
      expect(body.message).toBe('success');
    });

    it('should not call next() when authentication fails', async () => {
      vi.mocked(auth.verifyToken).mockReturnValue(null);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer invalid.token',
        },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { message: unknown };
      expect(body).toEqual({ error: 'Invalid or expired token' });
      expect(body.message).toBeUndefined(); // Route handler not called
    });
  });

  describe('edge cases', () => {
    it('should handle very long tokens', async () => {
      const longToken = 'a'.repeat(10000);
      const mockPayload = {
        userId: 'user-long',
        email: 'long@example.com',
      };

      vi.mocked(auth.verifyToken).mockReturnValue(mockPayload);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: `Bearer ${longToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(auth.verifyToken).toHaveBeenCalledWith(longToken);
    });

    it('should handle tokens with special characters', async () => {
      const specialToken = 'token-with_special.chars+123/456=';
      const mockPayload = {
        userId: 'user-special',
        email: 'special@example.com',
      };

      vi.mocked(auth.verifyToken).mockReturnValue(mockPayload);

      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: `Bearer ${specialToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(auth.verifyToken).toHaveBeenCalledWith(specialToken);
    });

    it('should handle Authorization header with different casing', async () => {
      // HTTP headers are case-insensitive, but "Bearer " prefix is case-sensitive
      await app.request('/protected/resource', {
        headers: {
          authorization: 'Bearer token123', // lowercase 'authorization'
        },
      });

      // Should work because Hono normalizes header names
      const mockPayload = {
        userId: 'user-case',
        email: 'case@example.com',
      };

      vi.mocked(auth.verifyToken).mockReturnValue(mockPayload);

      const res2 = await app.request('/protected/resource', {
        headers: {
          authorization: 'Bearer token123',
        },
      });

      expect(res2.status).toBe(200);
    });
  });
});
