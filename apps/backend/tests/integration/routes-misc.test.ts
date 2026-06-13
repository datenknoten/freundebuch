import type { Hono } from 'hono';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';
import type { AppContext } from '../../src/types/context.js';
import { resetConfig } from '../../src/utils/config.js';
import {
  type AuthTestContext,
  completeTestUserOnboarding,
  setupAuthTests,
  teardownAuthTests,
} from './auth.helpers.js';
import { authHeaders, createAuthenticatedUser, createTestFriend } from './friends.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

/**
 * Integration coverage for the smaller route groups (TEST-3): photo serving,
 * the unauthenticated Sentry tunnel (SSRF + validation), and the
 * users/onboarding flow.
 */
describe('Misc routes - Integration', () => {
  let context: AuthTestContext;
  // Onboarded user for the upload tests (uploads are behind the onboarding gate).
  let user: { externalId: string; email: string; sessionCookies: string };

  beforeAll(async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();
    user = await createAuthenticatedUser(context.pool, 'misc@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, user.externalId);
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(() => {
    resetRateLimiters();
  });

  afterAll(async () => {
    await teardownAuthTests(context);
    vi.unstubAllEnvs();
    resetConfig();
  }, SUITE_HOOK_TIMEOUT_MS);

  const appOf = (): Hono<AppContext> => context.app;

  async function asUser(method: string, path: string, body?: unknown): Promise<Response> {
    const init: RequestInit = { method, headers: authHeaders(user.sessionCookies) };
    if (body !== undefined) init.body = JSON.stringify(body);
    return appOf().fetch(new Request(`http://localhost${path}`, init));
  }

  const json = (res: Response): Promise<any> => res.json();

  describe('uploads', () => {
    it('rejects a non-UUID friend id with 400', async () => {
      const res = await asUser('GET', '/api/uploads/friends/not-a-uuid/photo.jpg');
      expect(res.status).toBe(400);
    });

    it('rejects a path-traversal filename', async () => {
      const friendId = await createTestFriend(context.pool, user.externalId, 'Photo Friend');
      const res = await appOf().fetch(
        new Request(
          `http://localhost/api/uploads/friends/${friendId}/${encodeURIComponent('../../etc/passwd')}`,
          { headers: authHeaders(user.sessionCookies) },
        ),
      );
      expect([400, 404]).toContain(res.status);
    });

    it('returns 404 for an owned friend with no photo on disk', async () => {
      const friendId = await createTestFriend(context.pool, user.externalId, 'No Photo');
      const res = await asUser('GET', `/api/uploads/friends/${friendId}/photo.jpg`);
      expect(res.status).toBe(404);
    });
  });

  describe('sentry tunnel', () => {
    async function tunnel(body: string): Promise<Response> {
      return appOf().fetch(
        new Request('http://localhost/api/sentry-tunnel', { method: 'POST', body }),
      );
    }

    it('rejects an unparseable envelope header', async () => {
      const res = await tunnel('not-json\n{}\n');
      expect(res.status).toBe(400);
    });

    it('rejects a non-Sentry ingest host (SSRF guard)', async () => {
      const envelope = `${JSON.stringify({ dsn: 'https://abc@evil.example.com/1' })}\n{}\n`;
      const res = await tunnel(envelope);
      expect(res.status).toBe(400);
    });
  });

  describe('users / onboarding', () => {
    it('reports onboarding status and completes onboarding via self-profile', async () => {
      // A fresh, un-onboarded user drives the full onboarding flow.
      const fresh = await createAuthenticatedUser(
        context.pool,
        'onboard@example.com',
        'Password123!',
      );
      const meHeaders = authHeaders(fresh.sessionCookies);

      const me = await appOf().fetch(
        new Request('http://localhost/api/users/me', { headers: meHeaders }),
      );
      expect(me.status).toBe(200);
      expect((await json(me)).hasCompletedOnboarding).toBe(false);

      const created = await appOf().fetch(
        new Request('http://localhost/api/users/me/self-profile', {
          method: 'POST',
          headers: meHeaders,
          body: JSON.stringify({ display_name: 'Onboard User' }),
        }),
      );
      expect(created.status).toBe(201);

      const after = await appOf().fetch(
        new Request('http://localhost/api/users/me', { headers: meHeaders }),
      );
      expect((await json(after)).hasCompletedOnboarding).toBe(true);
    });

    it('blocks an onboarding-gated route until the self-profile exists', async () => {
      // A separate user that never onboards must be refused by the gate.
      const gated = await createAuthenticatedUser(
        context.pool,
        'gated@example.com',
        'Password123!',
      );
      const res = await appOf().fetch(
        new Request('http://localhost/api/friends', { headers: authHeaders(gated.sessionCookies) }),
      );
      expect(res.status).toBe(403);
    });
  });
});
