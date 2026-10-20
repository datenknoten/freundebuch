import { parseWith } from '@datenknoten/kit/schema';
import { NotificationChannelResponseSchema } from '@freundebuch/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  type AuthTestContext,
  completeTestUserOnboarding,
  setupAuthTests,
  teardownAuthTests,
  truncateUserData,
} from './auth.helpers.js';
import { createAuthenticatedUser, sendAs } from './friends.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz';

/**
 * Notification channels integration suite (TEST-3). Covers CRUD, toggle and
 * the masked-credential behaviour. The test-send endpoint dispatches to a real
 * external service, so it is only exercised against a missing channel (404),
 * which short-circuits before any network call.
 */
describe('/api/notification-channels', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };

  beforeAll(async () => {
    context = await setupAuthTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    // Wipe every user-owned row and rebuild the fixture user, so no test
    // inherits channels (or a session) from its predecessors.
    await truncateUserData(context.pool);
    user = await createAuthenticatedUser(context.pool, 'notif@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, user.externalId);
  });

  afterAll(async () => {
    await teardownAuthTests(context);
  }, SUITE_HOOK_TIMEOUT_MS);

  function req(method: string, path: string, body?: unknown) {
    return sendAs(context.app, user.sessionCookies, method, path, body);
  }

  async function createDiscordChannel() {
    const res = await req('POST', '/api/notification-channels', {
      platform: 'discord',
      isEnabled: true,
      lookaheadDays: 7,
      notifyTime: '09:00',
      credentials: { webhookUrl: DISCORD_WEBHOOK },
    });
    expect(res.status).toBe(201);
    return parseWith(NotificationChannelResponseSchema, await res.json()).externalId;
  }

  describe('channel lifecycle', () => {
    it('creates, lists, gets, updates and deletes a channel', async () => {
      const id = await createDiscordChannel();

      const list = await req('GET', '/api/notification-channels');
      expect(list.status).toBe(200);
      expect(parseWith(NotificationChannelResponseSchema.array(), await list.json())).toHaveLength(
        1,
      );

      const got = await req('GET', `/api/notification-channels/${id}`);
      expect(got.status).toBe(200);
      const body = parseWith(NotificationChannelResponseSchema, await got.json());
      expect(body.platform).toBe('discord');
      // The webhook secret must be masked in responses, not echoed in full.
      expect(body.credentials).not.toHaveProperty('webhookUrl', DISCORD_WEBHOOK);

      const updated = await req('PUT', `/api/notification-channels/${id}`, { lookaheadDays: 14 });
      expect(updated.status).toBe(200);
      expect(parseWith(NotificationChannelResponseSchema, await updated.json()).lookaheadDays).toBe(
        14,
      );

      const deleted = await req('DELETE', `/api/notification-channels/${id}`);
      expect(deleted.status).toBe(200);
      expect((await req('GET', `/api/notification-channels/${id}`)).status).toBe(404);
    });

    it('toggles enabled state', async () => {
      const id = await createDiscordChannel();
      const res = await req('PATCH', `/api/notification-channels/${id}/toggle`, {
        isEnabled: false,
      });
      expect(res.status).toBe(200);
      expect(parseWith(NotificationChannelResponseSchema, await res.json()).isEnabled).toBe(false);
    });
  });

  describe('input validation', () => {
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

    /**
     * `sendMatrixMessage` rejects any protocol other than https as part of its
     * SSRF guard, and nothing validates the URL when the channel is created. An
     * `http://` homeserver therefore used to be accepted and stored, and the
     * failure only surfaced later - once a day, inside the digest scheduler.
     */
    it('rejects an http matrix homeserver at creation', async () => {
      const res = await req('POST', '/api/notification-channels', {
        platform: 'matrix',
        isEnabled: true,
        lookaheadDays: 7,
        notifyTime: '09:00',
        credentials: {
          homeserver: 'http://matrix.example.com',
          accessToken: 'syt_token',
          roomId: '!room:example.com',
        },
      });
      expect(res.status).toBe(400);
    });

    it('accepts an https matrix homeserver', async () => {
      const res = await req('POST', '/api/notification-channels', {
        platform: 'matrix',
        isEnabled: true,
        lookaheadDays: 7,
        notifyTime: '09:00',
        credentials: {
          homeserver: 'https://matrix.example.com',
          accessToken: 'syt_token',
          roomId: '!room:example.com',
        },
      });
      expect(res.status).toBe(201);
    });
  });
});
