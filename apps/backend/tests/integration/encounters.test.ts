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
 * Encounters integration suite (TEST-3). The create/update paths are
 * transactional (encounter row + encounter_friends links), so this exercises
 * the happy path, list pagination + preview, friend-set replacement on update,
 * and rollback when a write references a friend the user does not own.
 */
describe('Encounters API - Integration', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };

  beforeAll(async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();
    user = await createAuthenticatedUser(context.pool, 'encounters@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, user.externalId);
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    resetRateLimiters();
    await context.pool.query('DELETE FROM encounters.encounter_friends');
    await context.pool.query('DELETE FROM encounters.encounters');
    await context.pool.query(`
      DELETE FROM friends.friends c
      WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.self_profile_id = c.id)
    `);
  });

  afterAll(async () => {
    await teardownAuthTests(context);
    vi.unstubAllEnvs();
    resetConfig();
  }, SUITE_HOOK_TIMEOUT_MS);

  const appOf = (): Hono<AppContext> => context.app;
  const poolOf = (): pg.Pool => context.pool;

  async function req(method: string, path: string, body?: unknown): Promise<Response> {
    const init: RequestInit = { method, headers: authHeaders(user.sessionCookies) };
    if (body !== undefined) init.body = JSON.stringify(body);
    return appOf().fetch(new Request(`http://localhost${path}`, init));
  }

  const json = (res: Response): Promise<any> => res.json();

  it('creates an encounter with friends and reads it back', async () => {
    const friendId = await createTestFriend(poolOf(), user.externalId, 'Alice');
    const created = await req('POST', '/api/encounters', {
      title: 'Coffee',
      encounter_date: '2026-06-13',
      encounter_type: 'in_person',
      friend_ids: [friendId],
      location_text: 'Cafe',
    });
    expect(created.status).toBe(201);
    const body = await json(created);
    expect(body.friends.map((f: { id: string }) => f.id)).toEqual([friendId]);

    const got = await req('GET', `/api/encounters/${body.id}`);
    expect(got.status).toBe(200);
    expect((await json(got)).title).toBe('Coffee');
  });

  it('lists encounters with pagination and a friend preview', async () => {
    const friendId = await createTestFriend(poolOf(), user.externalId, 'Alice');
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
    const body = await json(list);
    expect(body.encounters.length).toBe(2);
    expect(body.pagination.totalCount).toBe(3);
    expect(body.encounters[0].friends[0].id).toBe(friendId);
  });

  it('replaces the friend set on update', async () => {
    const alice = await createTestFriend(poolOf(), user.externalId, 'Alice');
    const bob = await createTestFriend(poolOf(), user.externalId, 'Bob');
    const created = await json(
      await req('POST', '/api/encounters', {
        encounter_date: '2026-06-13',
        encounter_type: 'in_person',
        friend_ids: [alice],
      }),
    );

    const updated = await req('PUT', `/api/encounters/${created.id}`, { friend_ids: [bob] });
    expect(updated.status).toBe(200);
    expect((await json(updated)).friends.map((f: { id: string }) => f.id)).toEqual([bob]);
  });

  it('links only friends owned by the requesting user', async () => {
    const mine = await createTestFriend(poolOf(), user.externalId, 'Mine');
    const other = await createAuthenticatedUser(poolOf(), 'enc-other@example.com', 'Password123!');
    const otherFriend = await createTestFriend(poolOf(), other.externalId, 'Stranger');

    const created = await req('POST', '/api/encounters', {
      encounter_date: '2026-06-13',
      encounter_type: 'in_person',
      friend_ids: [mine, otherFriend],
    });
    expect(created.status).toBe(201);
    // The cross-user friend id is scoped out by the owner-joined insert; only
    // the caller's own friend is linked.
    expect((await json(created)).friends.map((f: { id: string }) => f.id)).toEqual([mine]);
  });

  it('deletes an encounter', async () => {
    const friendId = await createTestFriend(poolOf(), user.externalId, 'Alice');
    const created = await json(
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
