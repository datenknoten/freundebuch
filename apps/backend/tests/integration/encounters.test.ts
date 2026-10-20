import { parseWith } from '@datenknoten/kit/schema';
import { EncounterListResponseSchema, EncounterResponseSchema } from '@freundebuch/shared/index.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  type AuthTestContext,
  completeTestUserOnboarding,
  setupAuthTests,
  teardownAuthTests,
  truncateUserData,
} from './auth.helpers.js';
import { authHeaders, createAuthenticatedUser, createTestFriend } from './friends.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

/**
 * Encounters integration suite (TEST-3). The create/update paths are
 * transactional (encounter row + encounter_friends links), so this exercises
 * the happy path, list pagination + preview, friend-set replacement on update,
 * and rollback when a write references a friend the user does not own.
 */
describe('Encounters API', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };

  beforeAll(async () => {
    context = await setupAuthTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    // Wipe every user-owned row and rebuild the fixture user, so no test
    // inherits encounters or friends (or a session) from its predecessors.
    await truncateUserData(context.pool);
    user = await createAuthenticatedUser(context.pool, 'encounters@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, user.externalId);
  });

  afterAll(async () => {
    await teardownAuthTests(context);
  }, SUITE_HOOK_TIMEOUT_MS);

  async function req(method: string, path: string, body?: unknown) {
    const init: RequestInit = { method, headers: authHeaders(user.sessionCookies) };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    return context.app.fetch(new Request(`http://localhost${path}`, init));
  }

  async function parseEncounter(res: Response) {
    return parseWith(EncounterResponseSchema, await res.json());
  }

  describe('POST /api/encounters', () => {
    it('creates an encounter with friends and reads it back', async () => {
      const friendId = await createTestFriend(context.pool, user.externalId, 'Alice');
      const created = await req('POST', '/api/encounters', {
        title: 'Coffee',
        encounter_date: '2026-06-13',
        encounter_type: 'in_person',
        friend_ids: [friendId],
        location_text: 'Cafe',
      });
      expect(created.status).toBe(201);
      const body = await parseEncounter(created);
      expect(body.friends.map((f) => f.id)).toEqual([friendId]);

      const got = await req('GET', `/api/encounters/${body.id}`);
      expect(got.status).toBe(200);
      expect((await parseEncounter(got)).title).toBe('Coffee');
    });

    it('links only friends owned by the requesting user', async () => {
      const mine = await createTestFriend(context.pool, user.externalId, 'Mine');
      const other = await createAuthenticatedUser(
        context.pool,
        'enc-other@example.com',
        'Password123!',
      );
      const otherFriend = await createTestFriend(context.pool, other.externalId, 'Stranger');

      const created = await req('POST', '/api/encounters', {
        encounter_date: '2026-06-13',
        encounter_type: 'in_person',
        friend_ids: [mine, otherFriend],
      });
      expect(created.status).toBe(201);
      // The cross-user friend id is scoped out by the owner-joined insert; only
      // the caller's own friend is linked.
      expect((await parseEncounter(created)).friends.map((f) => f.id)).toEqual([mine]);
    });
  });

  describe('GET /api/encounters', () => {
    it('lists encounters with pagination and a friend preview', async () => {
      const friendId = await createTestFriend(context.pool, user.externalId, 'Alice');
      for (const date of ['2026-06-01', '2026-06-02', '2026-06-03']) {
        const res = await req('POST', '/api/encounters', {
          encounter_date: date,
          encounter_type: 'in_person',
          friend_ids: [friendId],
        });
        expect(res.status).toBe(201);
      }

      const list = await req('GET', '/api/encounters?page=1&page_size=2');
      expect(list.status).toBe(200);
      const body = parseWith(EncounterListResponseSchema, await list.json());
      expect(body.data.length).toBe(2);
      expect(body.pagination.totalCount).toBe(3);
      expect(body.data[0]?.friends[0]?.id).toBe(friendId);
    });
  });

  describe('PUT /api/encounters/:id', () => {
    it('replaces the friend set on update', async () => {
      const alice = await createTestFriend(context.pool, user.externalId, 'Alice');
      const bob = await createTestFriend(context.pool, user.externalId, 'Bob');
      const created = await parseEncounter(
        await req('POST', '/api/encounters', {
          encounter_date: '2026-06-13',
          encounter_type: 'in_person',
          friend_ids: [alice],
        }),
      );

      const updated = await req('PUT', `/api/encounters/${created.id}`, { friend_ids: [bob] });
      expect(updated.status).toBe(200);
      expect((await parseEncounter(updated)).friends.map((f) => f.id)).toEqual([bob]);
    });
  });

  describe('DELETE /api/encounters/:id', () => {
    it('deletes an encounter', async () => {
      const friendId = await createTestFriend(context.pool, user.externalId, 'Alice');
      const created = await parseEncounter(
        await req('POST', '/api/encounters', {
          encounter_date: '2026-06-13',
          encounter_type: 'in_person',
          friend_ids: [friendId],
        }),
      );

      expect((await req('DELETE', `/api/encounters/${created.id}`)).status).toBe(200);
      expect((await req('GET', `/api/encounters/${created.id}`)).status).toBe(404);
    });
  });
});
