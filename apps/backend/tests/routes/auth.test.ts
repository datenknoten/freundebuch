import { handleError } from '@datenknoten/kit/http';
import { parseWith } from '@datenknoten/kit/schema';
import { ErrorResponseSchema } from '@freundebuch/shared/index.js';
import { type Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Pool } from 'pg';
import pino from 'pino';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config.js';
import type { Auth } from '../../src/lib/auth.js';
import { createAuthMiddleware } from '../../src/middleware/auth.js';
import { createRateLimitMiddleware } from '../../src/middleware/rate-limit.js';
import { createAuthRoutes } from '../../src/routes/auth.js';
import type { FriendsService } from '../../src/services/friends/friends.service.js';
import { OAuthClientsService } from '../../src/services/oauth-clients.service.js';
import { UsersService } from '../../src/services/users.service.js';
import type { AppContext } from '../../src/types/context.js';
import { TEST_ENV } from '../helpers/test-env.js';

const mockGetSession = vi.fn<Auth['api']['getSession']>();
const mockHandler = vi.fn<Auth['handler']>();

const FAKE_AUTH: Auth = {
  handler: mockHandler,
  api: {
    getSession: mockGetSession,
    listPasskeys: vi.fn<Auth['api']['listPasskeys']>(),
    getMcpSession: vi.fn<Auth['api']['getMcpSession']>(),
  },
};

// The PgTyped OAuth client lookup runs its SQL through this fake pool.
const mockQuery = vi.fn();
// The routes under test only reach the database through pool.query.
const FAKE_DB = { query: mockQuery } as unknown as Pool;

function renderError(err: Error, c: Context<AppContext>) {
  const { status, body } = handleError(err, pino({ level: 'silent' }));
  // handleError only answers with statuses that carry a body.
  return c.json(body, status as ContentfulStatusCode);
}

// These tests validate the auth route structure and custom endpoints (/me, /preferences).
// Better Auth handler endpoints (sign-up, sign-in, sign-out, etc.) are tested
// via integration tests that run against a real database.

describe('auth routes', () => {
  let app: Hono<AppContext>;
  let logger: pino.Logger;

  beforeAll(() => {
    app = new Hono<AppContext>();
    logger = pino({ level: 'silent' });

    app.use('*', async (c, next) => {
      c.set('logger', logger);
      await next();
    });

    app.route(
      '/api/auth',
      createAuthRoutes({
        auth: FAKE_AUTH,
        usersService: new UsersService({
          db: FAKE_DB,
          logger,
          // The auth routes under test never create a self-profile.
          friendsService: {} as FriendsService,
          isSignupDisabled: false,
        }),
        oauthClientsService: new OAuthClientsService({ db: FAKE_DB }),
        authMiddleware: createAuthMiddleware({ auth: FAKE_AUTH }),
        passkeyListRateLimitMiddleware: createRateLimitMiddleware({
          config: loadConfig({ ...TEST_ENV }),
          limiter: 'passkeyList',
        }),
      }),
    );

    app.onError(renderError);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/auth/me', () => {
    it('answers 401 without a session', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/api/auth/me');

      expect(res.status).toBe(401);
      const data = parseWith(ErrorResponseSchema, await res.json());
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PATCH /api/auth/preferences', () => {
    it('answers 401 without a session', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      });

      expect(res.status).toBe(401);
      const data = parseWith(ErrorResponseSchema, await res.json());
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/auth/oauth2/client/:id', () => {
    it('answers 401 without a session', async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await app.request('/api/auth/oauth2/client/abc123');

      expect(res.status).toBe(401);
      const data = parseWith(ErrorResponseSchema, await res.json());
      expect(data.error).toBe('Unauthorized');
      // The lookup must not run for unauthenticated callers.
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns the client name to a signed-in user', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 'u1', email: 'u@example.com' } });
      mockQuery.mockResolvedValue({ rows: [{ name: 'Claude', icon: null }] });

      const res = await app.request('/api/auth/oauth2/client/abc123');

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ clientId: 'abc123', name: 'Claude', icon: null });
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['abc123']);
      // Must not fall through to the Better Auth handler.
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown client', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 'u1', email: 'u@example.com' } });
      mockQuery.mockResolvedValue({ rows: [] });

      const res = await app.request('/api/auth/oauth2/client/missing');

      expect(res.status).toBe(404);
      const data = parseWith(ErrorResponseSchema, await res.json());
      expect(data).toEqual({ error: 'OAuth client not found: missing', code: 'NOT_FOUND' });
    });
  });

  describe('POST /api/auth/sign-in/email', () => {
    it('hands non-custom paths to the Better Auth handler', async () => {
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
