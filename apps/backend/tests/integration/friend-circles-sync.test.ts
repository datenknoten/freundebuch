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
  truncateUserData,
} from './auth.helpers.js';
import { authHeaders, createAuthenticatedUser, createTestFriend } from './friends.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

/**
 * Circle assignments are exported as the vCard `CATEGORIES` property, so they
 * have to reach `friends.friend_changes` like every other sub-resource: an
 * incremental CardDAV sync only reports what the log contains, and a client
 * that never learns about the change keeps a stale card it may PUT back,
 * reverting the assignment. `friends.friend_circles` had no
 * `log_subresource_change` trigger until 1789045371456.
 */
describe('Friend circle assignments - CardDAV change log', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };
  let friendId: string;

  beforeAll(async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    resetRateLimiters();
    await truncateUserData(context.pool);
    user = await createAuthenticatedUser(
      context.pool,
      'friend-circles-sync@example.com',
      'Password123!',
    );
    await completeTestUserOnboarding(context.pool, user.externalId);
    friendId = await createTestFriend(context.pool, user.externalId, 'Circle Member');
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

  async function createCircle(name: string): Promise<string> {
    const res = await req('POST', '/api/circles', { name });
    expect(res.status).toBe(201);
    const body: unknown = await res.json();
    if (
      body === null ||
      typeof body !== 'object' ||
      !('id' in body) ||
      typeof body.id !== 'string'
    ) {
      throw new Error(`circle creation returned no id: ${JSON.stringify(body)}`);
    }
    return body.id;
  }

  /**
   * The change rows the sync log holds for our friend, joined back to
   * `friends.friends` so the test also proves the logged row identifies the
   * friend (the junction table has no `external_id` of its own).
   */
  async function changeLog(): Promise<{ changeType: string; displayName: string }[]> {
    const result = await context.pool.query<{ change_type: string; display_name: string }>(
      `SELECT fc.change_type, f.display_name
         FROM friends.friend_changes fc
         INNER JOIN friends.friends f ON f.id = fc.friend_id
        WHERE fc.friend_external_id = $1
        ORDER BY fc.id`,
      [friendId],
    );
    return result.rows.map((row) => ({
      changeType: row.change_type,
      displayName: row.display_name,
    }));
  }

  it('logs an update when a friend joins a circle and when the assignment is removed', async () => {
    const circleId = await createCircle('Work');

    // The INSERT into friends.friends already logged a 'create'.
    const beforeAssign = await changeLog();
    expect(beforeAssign).toEqual([{ changeType: 'create', displayName: 'Circle Member' }]);

    expect((await req('POST', `/api/friends/${friendId}/circles/${circleId}`)).status).toBe(201);

    const afterAssign = await changeLog();
    expect(afterAssign.length).toBe(beforeAssign.length + 1);
    expect(afterAssign.at(-1)).toEqual({ changeType: 'update', displayName: 'Circle Member' });

    expect((await req('DELETE', `/api/friends/${friendId}/circles/${circleId}`)).status).toBe(200);

    const afterRemove = await changeLog();
    expect(afterRemove.length).toBe(afterAssign.length + 1);
    expect(afterRemove.at(-1)).toEqual({ changeType: 'update', displayName: 'Circle Member' });
  });

  it('logs an update when the whole circle set is replaced', async () => {
    const work = await createCircle('Work');
    const family = await createCircle('Family');

    expect((await req('POST', `/api/friends/${friendId}/circles/${work}`)).status).toBe(201);
    const beforeReplace = await changeLog();

    // Replacing clears the old assignment and inserts the new one; both halves
    // are content changes, so both belong in the log.
    const replaced = await req('PUT', `/api/friends/${friendId}/circles`, {
      circle_ids: [family],
    });
    expect(replaced.status).toBe(200);

    const afterReplace = await changeLog();
    expect(afterReplace.length).toBeGreaterThan(beforeReplace.length);
    expect(afterReplace.at(-1)).toEqual({ changeType: 'update', displayName: 'Circle Member' });
  });

  it('logs an update when the friend is removed from a circle by deleting the circle', async () => {
    const circleId = await createCircle('Temporary');
    expect((await req('POST', `/api/friends/${friendId}/circles/${circleId}`)).status).toBe(201);
    const beforeDelete = await changeLog();

    // Deleting a circle cascades to friends.friend_circles, so the friend's
    // CATEGORIES shrink without anyone touching the friend row.
    expect((await req('DELETE', `/api/circles/${circleId}`)).status).toBe(200);

    const afterDelete = await changeLog();
    expect(afterDelete.length).toBe(beforeDelete.length + 1);
    expect(afterDelete.at(-1)).toEqual({ changeType: 'update', displayName: 'Circle Member' });
  });
});
