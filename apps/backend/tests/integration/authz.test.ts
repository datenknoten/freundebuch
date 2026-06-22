import type { Hono } from 'hono';
import type pg from 'pg';
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
 * Cross-user authorization sweep (TEST-1).
 *
 * This is a multi-tenant personal-data app, so IDOR is the worst plausible
 * bug class. For every resource type, user B must never be able to read or
 * mutate user A's data via its external id: the owner-scoped queries should
 * make those rows invisible (404), not merely hidden from listings.
 */
describe('Cross-user authorization', () => {
  let context: AuthTestContext;
  let userA: { externalId: string; email: string; sessionCookies: string };
  let userB: { externalId: string; email: string; sessionCookies: string };

  beforeAll(async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();

    userA = await createAuthenticatedUser(context.pool, 'authz-a@example.com', 'Password123!');
    userB = await createAuthenticatedUser(context.pool, 'authz-b@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, userA.externalId);
    await completeTestUserOnboarding(context.pool, userB.externalId);
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(() => {
    resetRateLimiters();
  });

  afterAll(async () => {
    await teardownAuthTests(context);
    vi.unstubAllEnvs();
    resetConfig();
  }, SUITE_HOOK_TIMEOUT_MS);

  const app = (): Hono<AppContext> => context.app;
  const pool = (): pg.Pool => context.pool;

  /** Issue a request as user B (the attacker) against an id owned by user A. */
  async function asB(method: string, path: string, body?: unknown): Promise<Response> {
    const init: RequestInit = { method, headers: authHeaders(userB.sessionCookies) };
    if (body !== undefined) init.body = JSON.stringify(body);
    return app().fetch(new Request(`http://localhost${path}`, init));
  }

  async function asA(method: string, path: string, body?: unknown): Promise<Response> {
    const init: RequestInit = { method, headers: authHeaders(userA.sessionCookies) };
    if (body !== undefined) init.body = JSON.stringify(body);
    return app().fetch(new Request(`http://localhost${path}`, init));
  }

  const json = (res: Response): Promise<any> => res.json();

  describe('friends', () => {
    it('hides another user friend from GET/PUT/DELETE', async () => {
      const friendId = await createTestFriend(pool(), userA.externalId, 'A Friend');

      expect((await asB('GET', `/api/friends/${friendId}`)).status).toBe(404);
      expect(
        (await asB('PUT', `/api/friends/${friendId}`, { display_name: 'hacked' })).status,
      ).toBe(404);
      expect((await asB('DELETE', `/api/friends/${friendId}`)).status).toBe(404);

      // The friend must remain untouched and owned by A.
      const owner = await asA('GET', `/api/friends/${friendId}`);
      expect(owner.status).toBe(200);
      expect((await json(owner)).displayName).toBe('A Friend');
    });
  });

  describe('friend sub-resources', () => {
    it('cannot create/update/delete emails on another user friend', async () => {
      const friendId = await createTestFriend(pool(), userA.externalId, 'A Friend');

      // A creates an email.
      const created = await asA('POST', `/api/friends/${friendId}/emails`, {
        email_address: 'a@example.com',
        email_type: 'personal',
      });
      expect(created.status).toBe(201);
      const emailId = (await json(created)).id;

      // B cannot touch the parent friend's sub-resources.
      expect(
        (
          await asB('POST', `/api/friends/${friendId}/emails`, {
            email_address: 'b@example.com',
            email_type: 'personal',
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await asB('PUT', `/api/friends/${friendId}/emails/${emailId}`, {
            email_address: 'hacked@example.com',
            email_type: 'personal',
          })
        ).status,
      ).toBe(404);
      expect((await asB('DELETE', `/api/friends/${friendId}/emails/${emailId}`)).status).toBe(404);
    });
  });

  describe('photos', () => {
    it('cannot fetch another user friend photo', async () => {
      const friendId = await createTestFriend(pool(), userA.externalId, 'A Friend');
      // No file exists, but the ownership check must reject B before that matters.
      const res = await asB('GET', `/api/uploads/friends/${friendId}/photo.jpg`);
      expect(res.status).toBe(404);
    });
  });

  describe('circles', () => {
    it('hides another user circle from GET/PUT/DELETE', async () => {
      const created = await asA('POST', '/api/circles', { name: 'A Circle' });
      expect(created.status).toBe(201);
      const circleId = (await json(created)).id;

      expect((await asB('GET', `/api/circles/${circleId}`)).status).toBe(404);
      expect((await asB('PUT', `/api/circles/${circleId}`, { name: 'hacked' })).status).toBe(404);
      expect((await asB('DELETE', `/api/circles/${circleId}`)).status).toBe(404);
    });
  });

  describe('encounters', () => {
    it('hides another user encounter from GET/PUT/DELETE', async () => {
      const friendId = await createTestFriend(pool(), userA.externalId, 'A Friend');
      const created = await asA('POST', '/api/encounters', {
        encounter_date: '2026-06-13',
        encounter_type: 'in_person',
        friend_ids: [friendId],
      });
      expect(created.status).toBe(201);
      const encounterId = (await json(created)).id;

      expect((await asB('GET', `/api/encounters/${encounterId}`)).status).toBe(404);
      expect((await asB('PUT', `/api/encounters/${encounterId}`, { title: 'hacked' })).status).toBe(
        404,
      );
      expect((await asB('DELETE', `/api/encounters/${encounterId}`)).status).toBe(404);
    });
  });

  describe('collectives', () => {
    it('hides another user collective from GET/PUT/DELETE', async () => {
      const typesRes = await asA('GET', '/api/collectives/types');
      const typeId = (await json(typesRes)).types[0].id;

      const created = await asA('POST', '/api/collectives', {
        name: 'A Collective',
        collective_type_id: typeId,
      });
      expect(created.status).toBe(201);
      const collectiveId = (await json(created)).id;

      expect((await asB('GET', `/api/collectives/${collectiveId}`)).status).toBe(404);
      expect(
        (await asB('PUT', `/api/collectives/${collectiveId}`, { name: 'hacked' })).status,
      ).toBe(404);
      expect((await asB('DELETE', `/api/collectives/${collectiveId}`)).status).toBe(404);
    });
  });

  describe('notification channels', () => {
    it('hides another user channel from GET/PUT/DELETE', async () => {
      const created = await asA('POST', '/api/notification-channels', {
        platform: 'discord',
        isEnabled: false,
        lookaheadDays: 7,
        notifyTime: '09:00',
        credentials: {
          webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz',
        },
      });
      expect(created.status).toBe(201);
      const channelId = (await json(created)).data.externalId;

      expect((await asB('GET', `/api/notification-channels/${channelId}`)).status).toBe(404);
      expect(
        (await asB('PUT', `/api/notification-channels/${channelId}`, { isEnabled: true })).status,
      ).toBe(404);
      expect((await asB('DELETE', `/api/notification-channels/${channelId}`)).status).toBe(404);
    });
  });
});
