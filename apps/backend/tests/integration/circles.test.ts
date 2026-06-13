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

/**
 * Circles integration suite (TEST-3). Covers CRUD plus the transactional
 * batch operations (reorder, merge) that previously had no coverage.
 */
describe('Circles API - Integration', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };

  beforeAll(async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();
    user = await createAuthenticatedUser(context.pool, 'circles@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, user.externalId);
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    resetRateLimiters();
    await context.pool.query('DELETE FROM friends.friend_circles');
    await context.pool.query('DELETE FROM friends.circles');
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

  async function createCircle(name: string, sortOrder = 0): Promise<string> {
    const res = await req('POST', '/api/circles', { name, sort_order: sortOrder });
    expect(res.status).toBe(201);
    return (await json(res)).id;
  }

  it('creates, reads, updates and deletes a circle', async () => {
    const created = await req('POST', '/api/circles', { name: 'Work', color: '#3B82F6' });
    expect(created.status).toBe(201);
    const id = (await json(created)).id;

    expect((await json(await req('GET', `/api/circles/${id}`))).name).toBe('Work');

    const updated = await req('PUT', `/api/circles/${id}`, { name: 'Colleagues' });
    expect(updated.status).toBe(200);
    expect((await json(updated)).name).toBe('Colleagues');

    expect((await req('DELETE', `/api/circles/${id}`)).status).toBe(200);
    expect((await req('GET', `/api/circles/${id}`)).status).toBe(404);
  });

  it('reorders circles atomically', async () => {
    const a = await createCircle('A', 0);
    const b = await createCircle('B', 1);
    const c = await createCircle('C', 2);

    const res = await req('PUT', '/api/circles/reorder', {
      order: [
        { id: a, sort_order: 2 },
        { id: b, sort_order: 0 },
        { id: c, sort_order: 1 },
      ],
    });
    expect(res.status).toBe(200);

    const list = await json(await req('GET', '/api/circles'));
    const byId = Object.fromEntries(
      list.map((x: { id: string; sortOrder: number }) => [x.id, x.sortOrder]),
    );
    expect(byId[a]).toBe(2);
    expect(byId[b]).toBe(0);
    expect(byId[c]).toBe(1);
  });

  it('merges one circle into another', async () => {
    const target = await createCircle('Target');
    const source = await createCircle('Source');

    const res = await req('POST', `/api/circles/${target}/merge`, { source_circle_id: source });
    expect(res.status).toBe(200);

    // The source circle is gone after a successful merge.
    expect((await req('GET', `/api/circles/${source}`)).status).toBe(404);
    expect((await req('GET', `/api/circles/${target}`)).status).toBe(200);
  });

  it('rejects merging a circle into itself', async () => {
    const id = await createCircle('Solo');
    const res = await req('POST', `/api/circles/${id}/merge`, { source_circle_id: id });
    expect(res.status).toBe(400);
  });
});
