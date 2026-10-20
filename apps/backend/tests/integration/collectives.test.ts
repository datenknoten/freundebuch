import { parseWith } from '@datenknoten/kit/schema';
import {
  CollectiveListResponseSchema,
  CollectiveMemberResponseSchema,
  CollectiveResponseSchema,
  CollectiveTypeListResponseSchema,
  EmailResponseSchema,
  FriendResponseSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { afterAll, assert, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  type AuthTestContext,
  completeTestUserOnboarding,
  setupAuthTests,
  teardownAuthTests,
  truncateUserData,
} from './auth.helpers.js';
import { authHeaders, createAuthenticatedUser, createTestFriend } from './friends.helpers.js';
import { SUITE_HOOK_TIMEOUT_MS } from './timeouts.js';

const SuccessResponseSchema = type({ success: 'boolean' });

/**
 * Real collectives integration suite (TEST-2). Replaces the previous inline
 * route test, which mocked auth to null so every request hit the 401 wall and
 * asserted [400, 401] — exercising nothing. Runs against real PostgreSQL and
 * covers CRUD, the transactional membership lifecycle, and sub-resources.
 */
describe('Collectives API', () => {
  let context: AuthTestContext;
  let user: { externalId: string; email: string; sessionCookies: string };
  let typeId: string;
  let roleId: string;

  beforeAll(async () => {
    context = await setupAuthTests();
  }, SUITE_HOOK_TIMEOUT_MS);

  beforeEach(async () => {
    // Wipe every user-owned row and rebuild the fixture user, so no test
    // inherits collectives (or a session) from its predecessors. The
    // system-default collective types have no owner and survive the wipe, but
    // reading them needs a session, so resolve them here too.
    await truncateUserData(context.pool);
    user = await createAuthenticatedUser(context.pool, 'collectives@example.com', 'Password123!');
    await completeTestUserOnboarding(context.pool, user.externalId);

    const types = await listTypes(user.sessionCookies);
    const [firstType] = types;
    assert.isDefined(firstType, 'the system-default collective types exist');
    const [firstRole] = firstType.roles;
    assert.isDefined(firstRole, 'the first collective type has a role');
    typeId = firstType.id;
    roleId = firstRole.id;
  });

  afterAll(async () => {
    await teardownAuthTests(context);
  }, SUITE_HOOK_TIMEOUT_MS);

  async function req(
    method: string,
    path: string,
    body?: unknown,
    sessionCookies = user.sessionCookies,
  ) {
    const init: RequestInit = { method, headers: authHeaders(sessionCookies) };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    return context.app.fetch(new Request(`http://localhost${path}`, init));
  }

  async function listTypes(sessionCookies: string) {
    const res = await req('GET', '/api/collectives/types', undefined, sessionCookies);
    return parseWith(CollectiveTypeListResponseSchema, await res.json()).types;
  }

  async function familyRoles() {
    const family = (await listTypes(user.sessionCookies)).find((t) => t.name === 'Family');
    assert.isDefined(family, 'the Family type is a system default');
    const parentRole = family.roles.find((r) => r.roleKey === 'parent');
    const childRole = family.roles.find((r) => r.roleKey === 'child');
    assert.isDefined(parentRole, 'Family defines a parent role');
    assert.isDefined(childRole, 'Family defines a child role');
    return { familyId: family.id, parentRoleId: parentRole.id, childRoleId: childRole.id };
  }

  async function parseCollective(res: Response) {
    return parseWith(CollectiveResponseSchema, await res.json());
  }

  async function parseMember(res: Response) {
    return parseWith(CollectiveMemberResponseSchema, await res.json());
  }

  async function parseFriend(res: Response) {
    return parseWith(FriendResponseSchema, await res.json());
  }

  async function createCollective(name = 'Test Collective') {
    const res = await req('POST', '/api/collectives', { name, collective_type_id: typeId });
    expect(res.status).toBe(201);
    return (await parseCollective(res)).id;
  }

  describe('CRUD', () => {
    it('creates, reads, updates and soft-deletes a collective', async () => {
      const created = await req('POST', '/api/collectives', {
        name: 'Book Club',
        collective_type_id: typeId,
        notes: 'Monthly',
      });
      expect(created.status).toBe(201);
      const body = await parseCollective(created);
      expect(body.name).toBe('Book Club');
      expect(body.memberCount).toBe(0);
      const id = body.id;

      const got = await req('GET', `/api/collectives/${id}`);
      expect(got.status).toBe(200);
      expect((await parseCollective(got)).name).toBe('Book Club');

      const updated = await req('PUT', `/api/collectives/${id}`, { name: 'Book Club Renamed' });
      expect(updated.status).toBe(200);
      expect((await parseCollective(updated)).name).toBe('Book Club Renamed');

      const deleted = await req('DELETE', `/api/collectives/${id}`);
      expect(deleted.status).toBe(200);
      expect(parseWith(SuccessResponseSchema, await deleted.json()).success).toBe(true);

      // Soft-deleted: gone from the default listing.
      const list = parseWith(
        CollectiveListResponseSchema,
        await (await req('GET', '/api/collectives')).json(),
      );
      expect(list.data.some((c) => c.id === id)).toBe(false);
    });

    it('lists collectives with the shared pagination shape', async () => {
      await createCollective('One');
      await createCollective('Two');

      const list = await req('GET', '/api/collectives?page=1&page_size=1');
      expect(list.status).toBe(200);
      const body = parseWith(CollectiveListResponseSchema, await list.json());
      expect(body.data.length).toBe(1);
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
      const friendId = await createTestFriend(context.pool, user.externalId, 'Member One');

      const added = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: friendId,
        role_id: roleId,
      });
      expect(added.status).toBe(201);
      const member = await parseMember(added);
      expect(member.isActive).toBe(true);
      expect(member.contact.id).toBe(friendId);
      const memberId = member.id;

      // The auto-relationship insert + membership insert are one transaction;
      // a successful add means the collective now reports the member.
      const afterAdd = await parseCollective(await req('GET', `/api/collectives/${collectiveId}`));
      expect(afterAdd.memberCount).toBe(1);
      expect(afterAdd.activeMemberCount).toBe(1);

      const deactivated = await req(
        'POST',
        `/api/collectives/${collectiveId}/members/${memberId}/deactivate`,
        { reason: 'Moved away' },
      );
      expect(deactivated.status).toBe(200);
      expect((await parseMember(deactivated)).isActive).toBe(false);

      const reactivated = await req(
        'POST',
        `/api/collectives/${collectiveId}/members/${memberId}/reactivate`,
        {},
      );
      expect(reactivated.status).toBe(200);
      const reBody = await parseMember(reactivated);
      expect(reBody.isActive).toBe(true);
      expect(reBody.inactiveReason).toBeNull();

      const removed = await req('DELETE', `/api/collectives/${collectiveId}/members/${memberId}`);
      expect(removed.status).toBe(200);
      expect(parseWith(SuccessResponseSchema, await removed.json()).success).toBe(true);

      const afterRemove = await parseCollective(
        await req('GET', `/api/collectives/${collectiveId}`),
      );
      expect(afterRemove.memberCount).toBe(0);
    });

    it('makes auto-created relationships visible on both contacts', async () => {
      // Use the Family type, which defines parent/child auto-relationship rules.
      const { familyId, parentRoleId, childRoleId } = await familyRoles();

      const res = await req('POST', '/api/collectives', {
        name: 'The Smiths',
        collective_type_id: familyId,
      });
      expect(res.status).toBe(201);
      const collectiveId = (await parseCollective(res)).id;

      const parentId = await createTestFriend(context.pool, user.externalId, 'Parent Smith');
      const childId = await createTestFriend(context.pool, user.externalId, 'Child Smith');

      const addParent = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: parentId,
        role_id: parentRoleId,
      });
      expect(addParent.status).toBe(201);

      const addChild = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: childId,
        role_id: childRoleId,
      });
      expect(addChild.status).toBe(201);

      // The existing edge (parent --[parent]--> child) shows on the parent...
      const parent = await parseFriend(await req('GET', `/api/friends/${parentId}`));
      const parentToChild = parent.relationships?.find((r) => r.relatedFriendId === childId);
      expect(parentToChild?.relationshipTypeId).toBe('parent');

      // ...and, critically, the reciprocal edge (child --[child]--> parent) is
      // now created so the relationship is also visible on the child.
      const child = await parseFriend(await req('GET', `/api/friends/${childId}`));
      const childToParent = child.relationships?.find((r) => r.relatedFriendId === parentId);
      expect(childToParent?.relationshipTypeId).toBe('child');
    });

    /**
     * A rule-derived edge collides with an identical manual one, and the
     * membership insert used to take ownership of it (ON CONFLICT ... SET
     * source_membership_id = EXCLUDED...). Removing that membership then
     * deleted a relationship the user had entered by hand.
     */
    it('keeps a manual relationship when a membership that re-derived it is removed', async () => {
      const { familyId, parentRoleId, childRoleId } = await familyRoles();

      const res = await req('POST', '/api/collectives', {
        name: 'The Manuals',
        collective_type_id: familyId,
      });
      expect(res.status).toBe(201);
      const collectiveId = (await parseCollective(res)).id;

      const parentId = await createTestFriend(context.pool, user.externalId, 'Parent Manual');
      const childId = await createTestFriend(context.pool, user.externalId, 'Child Manual');

      // Entered by hand, before any collective exists: parent --[parent]--> child
      // plus the reciprocal child --[child]--> parent.
      const manual = await req('POST', `/api/friends/${parentId}/relationships`, {
        related_friend_id: childId,
        relationship_type_id: 'parent',
      });
      expect(manual.status).toBe(201);

      const addParent = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: parentId,
        role_id: parentRoleId,
      });
      expect(addParent.status).toBe(201);

      // Adding the child re-derives exactly the manual pair from the Family rules.
      const addChild = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: childId,
        role_id: childRoleId,
      });
      expect(addChild.status).toBe(201);
      const childMembershipId = (await parseMember(addChild)).id;

      const removed = await req(
        'DELETE',
        `/api/collectives/${collectiveId}/members/${childMembershipId}`,
      );
      expect(removed.status).toBe(200);

      const parent = await parseFriend(await req('GET', `/api/friends/${parentId}`));
      expect(
        parent.relationships?.some(
          (r) => r.relatedFriendId === childId && r.relationshipTypeId === 'parent',
        ),
      ).toBe(true);

      const child = await parseFriend(await req('GET', `/api/friends/${childId}`));
      expect(
        child.relationships?.some(
          (r) => r.relatedFriendId === parentId && r.relationshipTypeId === 'child',
        ),
      ).toBe(true);

      // Still owned by nobody, so a future membership cannot claim it either.
      const { rows } = await context.pool.query<{ source_membership_id: number | null }>(
        `SELECT r.source_membership_id
           FROM friends.friend_relationships r
           INNER JOIN friends.friends f ON f.id = r.friend_id
          WHERE f.external_id = $1`,
        [parentId],
      );
      expect(rows.map((row) => row.source_membership_id)).toEqual([null]);
    });

    it('rejects adding the same friend twice', async () => {
      const collectiveId = await createCollective();
      const friendId = await createTestFriend(context.pool, user.externalId, 'Member Twice');

      const first = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: friendId,
        role_id: roleId,
      });
      expect(first.status).toBe(201);

      const second = await req('POST', `/api/collectives/${collectiveId}/members`, {
        friend_id: friendId,
        role_id: roleId,
      });
      expect(second.status).toBe(409);
    });

    /**
     * The duplicate check runs before the ownership lookups, so an unscoped
     * version answered "duplicate" (409) for someone else's collective and
     * contact — disclosing that a stranger's friend is in a stranger's
     * collective. It must be a plain 404 instead.
     */
    it('does not disclose another user\u2019s membership as a duplicate', async () => {
      const otherUser = await createAuthenticatedUser(
        context.pool,
        'collectives-other@example.com',
        'Password123!',
      );
      await completeTestUserOnboarding(context.pool, otherUser.externalId);

      // The other user's own collective and member, created with their session.
      const [otherType] = await listTypes(otherUser.sessionCookies);
      assert.isDefined(otherType, 'the system-default collective types exist');
      const [otherRole] = otherType.roles;
      assert.isDefined(otherRole, 'the first collective type has a role');
      const otherCollective = await req(
        'POST',
        '/api/collectives',
        { name: 'Their Club', collective_type_id: otherType.id },
        otherUser.sessionCookies,
      );
      expect(otherCollective.status).toBe(201);
      const otherCollectiveId = (await parseCollective(otherCollective)).id;
      const otherFriendId = await createTestFriend(
        context.pool,
        otherUser.externalId,
        'Their Member',
      );
      const otherAdd = await req(
        'POST',
        `/api/collectives/${otherCollectiveId}/members`,
        { friend_id: otherFriendId, role_id: otherRole.id },
        otherUser.sessionCookies,
      );
      expect(otherAdd.status).toBe(201);
      // Our user asks about that pair: not found, never "duplicate".
      const probe = await req('POST', `/api/collectives/${otherCollectiveId}/members`, {
        friend_id: otherFriendId,
        role_id: roleId,
      });
      expect(probe.status).toBe(404);
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
      expect(parseWith(EmailResponseSchema, await email.json()).isPrimary).toBe(true);

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
      expect(parseWith(EmailResponseSchema.array(), await emails.json()).length).toBe(1);
    });
  });
});
