import { parseWith } from '@datenknoten/kit/schema';
import { CircleResponseSchema } from '@freundebuch/shared/index.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  type AuthTestContext,
  completeTestUserOnboarding,
  setupAuthTests,
  teardownAuthTests,
  truncateUserData,
} from './auth.helpers.js';
import { authHeaders, createAuthenticatedUser } from './friends.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

/**
 * Circles integration suite (TEST-3). Covers CRUD plus the transactional
 * batch operations (reorder, merge) that previously had no coverage.
 */
describe('Circles API', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };

  beforeAll(async () => {
    context = await setupAuthTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    // Wipe every user-owned row and rebuild the fixture user, so no test
    // inherits circles (or a session) from its predecessors.
    await truncateUserData(context.pool);
    user = await createAuthenticatedUser(context.pool, 'circles@example.com', 'Password123!');
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

  async function parseCircle(res: Response) {
    return parseWith(CircleResponseSchema, await res.json());
  }

  async function createCircle(name: string, sortOrder = 0) {
    const res = await req('POST', '/api/circles', { name, sort_order: sortOrder });
    expect(res.status).toBe(201);
    return (await parseCircle(res)).id;
  }

  describe('CRUD', () => {
    it('creates, reads, updates and deletes a circle', async () => {
      const created = await req('POST', '/api/circles', { name: 'Work', color: '#3B82F6' });
      expect(created.status).toBe(201);
      const id = (await parseCircle(created)).id;

      expect((await parseCircle(await req('GET', `/api/circles/${id}`))).name).toBe('Work');

      const updated = await req('PUT', `/api/circles/${id}`, { name: 'Colleagues' });
      expect(updated.status).toBe(200);
      expect((await parseCircle(updated)).name).toBe('Colleagues');

      expect((await req('DELETE', `/api/circles/${id}`)).status).toBe(200);
      expect((await req('GET', `/api/circles/${id}`)).status).toBe(404);
    });
  });

  describe('PUT /api/circles/reorder', () => {
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

      const list = parseWith(
        CircleResponseSchema.array(),
        await (await req('GET', '/api/circles')).json(),
      );
      const byId = Object.fromEntries(list.map((x) => [x.id, x.sortOrder]));
      expect(byId[a]).toBe(2);
      expect(byId[b]).toBe(0);
      expect(byId[c]).toBe(1);
    });

    /**
     * `sort_order` lands in an `integer` column. node-postgres sends parameters
     * as text, so Postgres rejects "1.5" with `invalid input syntax for type
     * integer` - an unhandled driver error, i.e. a 500 for what is plainly a bad
     * request. The boundary has to reject it instead.
     */
    it('rejects a non-integer sort_order with 400 rather than failing in the driver', async () => {
      const a = await createCircle('A', 0);

      const res = await req('PUT', '/api/circles/reorder', {
        order: [{ id: a, sort_order: 1.5 }],
      });

      expect(res.status).toBe(400);

      // The circle keeps its original position.
      const list = parseWith(
        CircleResponseSchema.array(),
        await (await req('GET', '/api/circles')).json(),
      );
      expect(list.find((x) => x.id === a)?.sortOrder).toBe(0);
    });
  });

  describe('POST /api/circles/:id/merge', () => {
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
});
