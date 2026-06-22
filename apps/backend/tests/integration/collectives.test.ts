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
 * Real collectives integration suite (TEST-2). Replaces the previous inline
 * route test, which mocked auth to null so every request hit the 401 wall and
 * asserted [400, 401] — exercising nothing. Runs against real PostgreSQL and
 * covers CRUD, the transactional membership lifecycle, and sub-resources.
 */
describe('Collectives API - Integration', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };
  let typeId: string;
  let roleId: string;

  beforeAll(async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('LOG_LEVEL', 'silent');

    context = await setupAuthTests();
    user = await createAuthenticatedUser(context.pool, 'collectives@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, user.externalId);

    // A system-default collective type and one of its roles are needed for
    // create + membership tests.
    const typesRes = await req('GET', '/api/collectives/types');
    const type = (await json(typesRes)).types[0];
    typeId = type.id;
    roleId = type.roles[0].id;
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    resetRateLimiters();
    // Wipe collectives (and their cascade) between tests; self-profile friend stays.
    await context.pool.query('DELETE FROM collectives.collective_memberships');
    await context.pool.query('DELETE FROM collectives.collectives');
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

  async function createCollective(name = 'Test Collective'): Promise<string> {
    const res = await req('POST', '/api/collectives', { name, collective_type_id: typeId });
    expect(res.status).toBe(201);
    return (await json(res)).id;
  }

  describe('CRUD', () => {
    it('creates, reads, updates and soft-deletes a collective', async () => {
      const created = await req('POST', '/api/collectives', {
        name: 'Book Club',
        collective_type_id: typeId,
        notes: 'Monthly',
      });
      expect(created.status).toBe(201);
      const body = await json(created);
      expect(body.name).toBe('Book Club');
      expect(body.memberCount).toBe(0);
      const id = body.id;

      const got = await req('GET', `/api/collectives/${id}`);
      expect(got.status).toBe(200);
      expect((await json(got)).name).toBe('Book Club');

      const updated = await req('PUT', `/api/collectives/${id}`, { name: 'Book Club Renamed' });
      expect(updated.status).toBe(200);
      expect((await json(updated)).name).toBe('Book Club Renamed');

      const deleted = await req('DELETE', `/api/collectives/${id}`);
      expect(deleted.status).toBe(200);
      expect((await json(deleted)).success).toBe(true);

      // Soft-deleted: gone from the default listing.
      const list = await req('GET', '/api/collectives');
      expect((await json(list)).collectives.some((c: { id: string }) => c.id === id)).toBe(false);
    });

    it('lists collectives with the shared pagination shape', async () => {
      await createCollective('One');
      await createCollective('Two');

      const list = await req('GET', '/api/collectives?page=1&page_size=1');
      expect(list.status).toBe(200);
      const body = await json(list);
      expect(body.collectives.length).toBe(1);
      expect(body.pagination.totalCount).toBe(2);
      expect(body.pagination.totalPages).toBe(2);
      expect(body.pagination.page).toBe(1);
    });

    it('rejects creation without a name', async () => {
      const res = await req('POST', '/api/collectives', { collective_type_id: typeId });
      expect(res.status).toBe(400);
    });
  });

  describe('membership lifecycle', () => {
    it('adds, deactivates, reactivates, re-roles and removes a member', async () => {
      const collectiveId = await createCollective();
      const friendId = await createTestFriend(poolOf(), user.externalId, 'Member One');

      const added = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: friendId,
        role_id: roleId,
      });
      expect(added.status).toBe(201);
      const member = await json(added);
      expect(member.isActive).toBe(true);
      expect(member.contact.id).toBe(friendId);
      const memberId = member.id;

      // The auto-relationship insert + membership insert are one transaction;
      // a successful add means the collective now reports the member.
      const afterAdd = await json(await req('GET', `/api/collectives/${collectiveId}`));
      expect(afterAdd.memberCount).toBe(1);
      expect(afterAdd.activeMemberCount).toBe(1);

      const deactivated = await req(
        'POST',
        `/api/collectives/${collectiveId}/members/${memberId}/deactivate`,
        { reason: 'Moved away' },
      );
      expect(deactivated.status).toBe(200);
      expect((await json(deactivated)).isActive).toBe(false);

      const reactivated = await req(
        'POST',
        `/api/collectives/${collectiveId}/members/${memberId}/reactivate`,
        {},
      );
      expect(reactivated.status).toBe(200);
      const reBody = await json(reactivated);
      expect(reBody.isActive).toBe(true);
      expect(reBody.inactiveReason).toBeNull();

      const removed = await req('DELETE', `/api/collectives/${collectiveId}/members/${memberId}`);
      expect(removed.status).toBe(200);
      expect((await json(removed)).success).toBe(true);

      const afterRemove = await json(await req('GET', `/api/collectives/${collectiveId}`));
      expect(afterRemove.memberCount).toBe(0);
    });

    it('makes auto-created relationships visible on both contacts', async () => {
      // Use the Family type, which defines parent/child auto-relationship rules.
      const types = (await json(await req('GET', '/api/collectives/types'))).types;
      const family = types.find((t: any) => t.name === 'Family');
      expect(family).toBeDefined();
      const parentRole = family.roles.find((r: any) => r.roleKey === 'parent');
      const childRole = family.roles.find((r: any) => r.roleKey === 'child');

      const res = await req('POST', '/api/collectives', {
        name: 'The Smiths',
        collective_type_id: family.id,
      });
      expect(res.status).toBe(201);
      const collectiveId = (await json(res)).id;

      const parentId = await createTestFriend(poolOf(), user.externalId, 'Parent Smith');
      const childId = await createTestFriend(poolOf(), user.externalId, 'Child Smith');

      const addParent = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: parentId,
        role_id: parentRole.id,
      });
      expect(addParent.status).toBe(201);

      const addChild = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: childId,
        role_id: childRole.id,
      });
      expect(addChild.status).toBe(201);

      // The existing edge (parent --[parent]--> child) shows on the parent...
      const parent = await json(await req('GET', `/api/friends/${parentId}`));
      const parentToChild = parent.relationships.find((r: any) => r.relatedFriendId === childId);
      expect(parentToChild).toBeDefined();
      expect(parentToChild.relationshipTypeId).toBe('parent');

      // ...and, critically, the reciprocal edge (child --[child]--> parent) is
      // now created so the relationship is also visible on the child.
      const child = await json(await req('GET', `/api/friends/${childId}`));
      const childToParent = child.relationships.find((r: any) => r.relatedFriendId === parentId);
      expect(childToParent).toBeDefined();
      expect(childToParent.relationshipTypeId).toBe('child');
    });
  });

  describe('sub-resources', () => {
    it('manages emails, phones, urls and addresses', async () => {
      const collectiveId = await createCollective();

      const email = await req('POST', `/api/collectives/${collectiveId}/emails`, {
        email_address: 'club@example.com',
        email_type: 'work',
        is_primary: true,
      });
      expect(email.status).toBe(201);
      expect((await json(email)).isPrimary).toBe(true);

      const phone = await req('POST', `/api/collectives/${collectiveId}/phones`, {
        phone_number: '+14155552671',
        phone_type: 'work',
      });
      expect(phone.status).toBe(201);

      const url = await req('POST', `/api/collectives/${collectiveId}/urls`, {
        url: 'https://example.com',
        url_type: 'work',
      });
      expect(url.status).toBe(201);

      const address = await req('POST', `/api/collectives/${collectiveId}/addresses`, {
        street_line1: '123 Main St',
        city: 'Berlin',
        postal_code: '10115',
        country: 'DE',
        address_type: 'work',
      });
      expect(address.status).toBe(201);

      const emails = await req('GET', `/api/collectives/${collectiveId}/emails`);
      expect((await json(emails)).length).toBe(1);
    });
  });
});
