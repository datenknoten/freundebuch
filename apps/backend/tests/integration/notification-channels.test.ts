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
import { authHeaders, createAuthenticatedUser } from './friends.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz';

/**
 * Notification channels integration suite (TEST-3). Covers CRUD, toggle and
 * the masked-credential behaviour. The test-send endpoint dispatches to a real
 * external service, so it is only exercised against a missing channel (404),
 * which short-circuits before any network call.
 */
describe('Notification Channels API - Integration', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };

  beforeAll(async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();
    user = await createAuthenticatedUser(context.pool, 'notif@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, user.externalId);
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    resetRateLimiters();
    await context.pool.query('DELETE FROM system.notification_channels');
  });

  afterAll(async () => {
    await teardownAuthTests(context);
    vi.unstubAllEnvs();
    resetConfig();
  }, SUITE_HOOK_TIMEOUT_MS);

  const appOf = (): Hono<AppContext> => context.app;

  async function req(method: string, path: string, body?: unknown): Promise<Response> {
    const init: RequestInit = { method, headers: authHeaders(user.sessionCookies) };
    if (body !== undefined) init.body = JSON.stringify(body);
    return appOf().fetch(new Request(`http://localhost${path}`, init));
  }

  const json = (res: Response): Promise<any> => res.json();

  async function createDiscordChannel(): Promise<string> {
    const res = await req('POST', '/api/notification-channels', {
      platform: 'discord',
      isEnabled: true,
      lookaheadDays: 7,
      notifyTime: '09:00',
      credentials: { webhookUrl: DISCORD_WEBHOOK },
    });
    expect(res.status).toBe(201);
    return (await json(res)).data.externalId;
  }

  it('creates, lists, gets, updates and deletes a channel', async () => {
    const id = await createDiscordChannel();

    const list = await req('GET', '/api/notification-channels');
    expect(list.status).toBe(200);
    expect((await json(list)).data.length).toBe(1);

    const got = await req('GET', `/api/notification-channels/${id}`);
    expect(got.status).toBe(200);
    const body = await json(got);
    expect(body.data.platform).toBe('discord');
    // The webhook secret must be masked in responses, not echoed in full.
    expect(body.data.credentials.webhookUrl).not.toBe(DISCORD_WEBHOOK);

    const updated = await req('PUT', `/api/notification-channels/${id}`, { lookaheadDays: 14 });
    expect(updated.status).toBe(200);
    expect((await json(updated)).data.lookaheadDays).toBe(14);

    const deleted = await req('DELETE', `/api/notification-channels/${id}`);
    expect(deleted.status).toBe(200);
    expect((await req('GET', `/api/notification-channels/${id}`)).status).toBe(404);
  });

  it('toggles enabled state', async () => {
    const id = await createDiscordChannel();
    const res = await req('PATCH', `/api/notification-channels/${id}/toggle`, { isEnabled: false });
    expect(res.status).toBe(200);
    expect((await json(res)).data.isEnabled).toBe(false);
  });

  it('rejects an invalid notify time', async () => {
    const res = await req('POST', '/api/notification-channels', {
      platform: 'discord',
      isEnabled: true,
      lookaheadDays: 7,
      notifyTime: '99:99',
      credentials: { webhookUrl: DISCORD_WEBHOOK },
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when test-sending a missing channel', async () => {
    const res = await req(
      'POST',
      '/api/notification-channels/00000000-0000-0000-0000-000000000000/test',
    );
    expect(res.status).toBe(404);
  });
});
