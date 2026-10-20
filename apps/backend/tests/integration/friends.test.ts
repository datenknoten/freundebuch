import { parseWith } from '@datenknoten/kit/schema';
import {
  AddressResponseSchema,
  EmailResponseSchema,
  ErrorResponseSchema,
  FriendListResponseSchema,
  FriendResponseSchema,
  PhoneResponseSchema,
  UrlResponseSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import {
  authHeaders,
  countUserFriends,
  createAuthenticatedUser,
  createTestFriend,
  getTestFriend,
  setupFriendsTestSuite,
} from './friends.helpers.js';

const MessageResponseSchema = type({ message: 'string' });

function aPhoneInput(index: number) {
  return { phone_number: `+1212555${String(1000 + index).padStart(4, '0')}`, phone_type: 'mobile' };
}

function anEmailInput(index: number) {
  return { email_address: `test${index}@example.com`, email_type: 'personal' };
}

function aUrlInput(index: number) {
  return { url: `https://example${index}.com`, url_type: 'personal' };
}

describe('Friends API', () => {
  const { getContext } = setupFriendsTestSuite();

  describe('GET /api/friends', () => {
    it('returns only the self-profile when no other friends exist', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'GET',
        headers: authHeaders(testUser.sessionCookies),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendListResponseSchema, await response.json());

      expect(response.status).toBe(200);
      // Self-profile is always present (created during onboarding)
      expect(body.data.length).toBe(1);
      expect(body.data[0]?.displayName).toBe('Test User (Self)');
      expect(body.pagination.totalCount).toBe(1);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.pageSize).toBe(25);
      expect(body.pagination.totalPages).toBe(1);
    });

    it('paginates the friends list', async () => {
      const { app, pool, testUser } = getContext();

      await createTestFriend(pool, testUser.externalId, 'Alice');
      await createTestFriend(pool, testUser.externalId, 'Bob');
      await createTestFriend(pool, testUser.externalId, 'Charlie');

      const request = new Request('http://localhost/api/friends?page=1&page_size=2', {
        method: 'GET',
        headers: authHeaders(testUser.sessionCookies),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendListResponseSchema, await response.json());

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
      // Total includes self-profile + 3 created friends
      expect(body.pagination.totalCount).toBe(4);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.pageSize).toBe(2);
      expect(body.pagination.totalPages).toBe(2);
    });

    it('sorts friends by display name', async () => {
      const { app, pool, testUser } = getContext();

      await createTestFriend(pool, testUser.externalId, 'Charlie');
      await createTestFriend(pool, testUser.externalId, 'Alice');
      await createTestFriend(pool, testUser.externalId, 'Bob');

      const request = new Request(
        'http://localhost/api/friends?sort_by=display_name&sort_order=asc',
        {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        },
      );

      const response = await app.fetch(request);
      const body = parseWith(FriendListResponseSchema, await response.json());

      expect(response.status).toBe(200);
      expect(body.data[0]?.displayName).toBe('Alice');
      expect(body.data[1]?.displayName).toBe('Bob');
      expect(body.data[2]?.displayName).toBe('Charlie');
    });

    it('rejects an unauthenticated request with 401', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'GET',
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/friends', () => {
    it('creates a friend from a display name alone', async () => {
      const { app, pool, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'John Doe',
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendResponseSchema, await response.json());

      expect(response.status).toBe(201);
      expect(body).toHaveProperty('id');
      expect(body.displayName).toBe('John Doe');
      expect(body.phones).toEqual([]);
      expect(body.emails).toEqual([]);
      expect(body.addresses).toEqual([]);
      expect(body.urls).toEqual([]);
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');

      // The self-profile created during onboarding counts too.
      const count = await countUserFriends(pool, testUser.externalId);
      expect(count).toBe(2);
    });

    it('creates a friend with all name parts', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Dr. John M. Smith Jr.',
          name_prefix: 'Dr.',
          name_first: 'John',
          name_middle: 'M.',
          name_last: 'Smith',
          name_suffix: 'Jr.',
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendResponseSchema, await response.json());

      expect(response.status).toBe(201);
      expect(body.displayName).toBe('Dr. John M. Smith Jr.');
      expect(body.namePrefix).toBe('Dr.');
      expect(body.nameFirst).toBe('John');
      expect(body.nameMiddle).toBe('M.');
      expect(body.nameLast).toBe('Smith');
      expect(body.nameSuffix).toBe('Jr.');
    });

    it('creates a friend with phones, emails, addresses and urls', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Full Friend',
          phones: [
            { phone_number: '+12125551234', phone_type: 'mobile', is_primary: true },
            { phone_number: '+16505551234', phone_type: 'work', label: 'Office' },
          ],
          emails: [{ email_address: 'test@example.com', email_type: 'personal', is_primary: true }],
          addresses: [
            {
              street_line1: '123 Main St',
              city: 'Anytown',
              state_province: 'CA',
              postal_code: '12345',
              country: 'US',
              address_type: 'home',
              is_primary: true,
            },
          ],
          urls: [{ url: 'https://example.com', url_type: 'personal' }],
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendResponseSchema, await response.json());

      expect(response.status).toBe(201);
      expect(body.phones.length).toBe(2);
      expect(body.phones[0]?.phoneNumber).toBe('+12125551234');
      expect(body.phones[0]?.isPrimary).toBe(true);
      expect(body.emails.length).toBe(1);
      expect(body.emails[0]?.emailAddress).toBe('test@example.com');
      expect(body.addresses.length).toBe(1);
      expect(body.addresses[0]?.city).toBe('Anytown');
      expect(body.urls.length).toBe(1);
      expect(body.urls[0]?.url).toBe('https://example.com');
    });

    it('rejects an invalid email format with 400', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Test Friend',
          emails: [{ email_address: 'invalid-email', email_type: 'personal' }],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('rejects an empty display name with 400', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: '',
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/friends/:id', () => {
    it('returns a friend with its related data', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'John Doe');

      await pool.query(
        `INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
         SELECT c.id, '+12125551234', 'mobile', true
         FROM friends.friends c WHERE c.external_id = $1`,
        [friendId],
      );

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'GET',
        headers: authHeaders(testUser.sessionCookies),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendResponseSchema, await response.json());

      expect(response.status).toBe(200);
      expect(body.id).toBe(friendId);
      expect(body.displayName).toBe('John Doe');
      expect(body.phones.length).toBe(1);
      expect(body.phones[0]?.phoneNumber).toBe('+12125551234');
    });

    it('returns 404 for a non-existent friend', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/friends/00000000-0000-0000-0000-000000000000',
        {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/friends/:id', () => {
    it('updates the display name', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Old Name');

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'PUT',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'New Name',
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendResponseSchema, await response.json());

      expect(response.status).toBe(200);
      expect(body.displayName).toBe('New Name');

      const friend = await getTestFriend(pool, friendId);
      expect(friend?.displayName).toBe('New Name');
    });

    it('clears a name part set to null', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Dr. John Smith');
      await pool.query("UPDATE friends.friends SET name_prefix = 'Dr.' WHERE external_id = $1", [
        friendId,
      ]);

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'PUT',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          name_prefix: null,
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendResponseSchema, await response.json());

      expect(response.status).toBe(200);
      expect(body.namePrefix).toBeUndefined();
    });

    it('returns 404 for a non-existent friend', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/friends/00000000-0000-0000-0000-000000000000',
        {
          method: 'PUT',
          headers: authHeaders(testUser.sessionCookies),
          body: JSON.stringify({ display_name: 'Test' }),
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/friends/:id', () => {
    it('soft-deletes the friend and hides it from the list', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'To Be Deleted');

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: authHeaders(testUser.sessionCookies),
      });

      const response = await app.fetch(request);
      const body = parseWith(MessageResponseSchema, await response.json());

      expect(response.status).toBe(200);
      expect(body.message).toBe('Friend deleted successfully');

      const friend = await getTestFriend(pool, friendId);
      expect(friend?.deletedAt).not.toBeNull();

      // Should not appear in list (only self-profile remains)
      const listRequest = new Request('http://localhost/api/friends', {
        method: 'GET',
        headers: authHeaders(testUser.sessionCookies),
      });

      const listResponse = await app.fetch(listRequest);
      const listBody = parseWith(FriendListResponseSchema, await listResponse.json());

      expect(listBody.data.length).toBe(1);
      expect(listBody.data[0]?.displayName).toBe('Test User (Self)');
    });

    it('returns 404 for a non-existent friend', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/friends/00000000-0000-0000-0000-000000000000',
        {
          method: 'DELETE',
          headers: authHeaders(testUser.sessionCookies),
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/friends/:id/relationships', () => {
    it('returns 409 when the same relationship is created twice', async () => {
      const { app, pool, testUser } = getContext();

      const headers = authHeaders(testUser.sessionCookies);
      const friendId = await createTestFriend(pool, testUser.externalId, 'Rel Source');
      const relatedId = await createTestFriend(pool, testUser.externalId, 'Rel Target');

      const body = JSON.stringify({
        related_friend_id: relatedId,
        relationship_type_id: 'spouse',
      });

      const first = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/relationships`, {
          method: 'POST',
          headers,
          body,
        }),
      );
      expect(first.status).toBe(201);

      const second = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/relationships`, {
          method: 'POST',
          headers,
          body,
        }),
      );

      expect(second.status).toBe(409);
      expect(parseWith(ErrorResponseSchema, await second.json())).toMatchObject({
        error: 'This relationship already exists',
        code: 'CONFLICT',
      });
    });

    it('rejects a relationship with self with 400', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Self Rel');

      const response = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/relationships`, {
          method: 'POST',
          headers: authHeaders(testUser.sessionCookies),
          body: JSON.stringify({
            related_friend_id: friendId,
            relationship_type_id: 'spouse',
          }),
        }),
      );

      expect(response.status).toBe(400);
      expect(parseWith(ErrorResponseSchema, await response.json())).toMatchObject({
        error: 'Cannot create relationship with self',
      });
    });
  });

  describe('/api/friends/:id/phones', () => {
    it('adds a phone to a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/phones`, {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          phone_number: '+12125551234',
          phone_type: 'mobile',
          is_primary: true,
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(PhoneResponseSchema, await response.json());

      expect(response.status).toBe(201);
      expect(body).toHaveProperty('id');
      expect(body.phoneNumber).toBe('+12125551234');
      expect(body.phoneType).toBe('mobile');
      expect(body.isPrimary).toBe(true);
    });

    it('lists the phones of a friend, the first one primary', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'List Phones Friend');
      const headers = authHeaders(testUser.sessionCookies);

      const created = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/phones`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone_number: '+12125559999', phone_type: 'mobile' }),
        }),
      );
      expect(created.status).toBe(201);

      const listed = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/phones`, { headers }),
      );
      expect(listed.status).toBe(200);

      const phones = parseWith(PhoneResponseSchema.array(), await listed.json());
      expect(phones.map((phone) => phone.phoneNumber)).toContain('+12125559999');
      // First entry of an empty set becomes the primary automatically.
      expect(phones[0]?.isPrimary).toBe(true);
    });

    /**
     * Setting is_primary clears the owner's current primary first. When the
     * updated id does not exist, that clear used to be committed anyway, so a
     * 404 left the friend with no primary phone at all.
     */
    it('keeps the existing primary when updating a phone id that does not exist', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Primary Keeper');
      const headers = authHeaders(testUser.sessionCookies);

      const created = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/phones`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone_number: '+12125550001',
            phone_type: 'mobile',
            is_primary: true,
          }),
        }),
      );
      expect(created.status).toBe(201);

      const missing = await app.fetch(
        new Request(
          `http://localhost/api/friends/${friendId}/phones/00000000-0000-0000-0000-000000000000`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              phone_number: '+12125550002',
              phone_type: 'work',
              is_primary: true,
            }),
          },
        ),
      );
      expect(missing.status).toBe(404);

      const listed = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/phones`, { headers }),
      );
      const phones = parseWith(PhoneResponseSchema.array(), await listed.json());
      expect(phones.length).toBe(1);
      expect(phones[0]?.phoneNumber).toBe('+12125550001');
      expect(phones[0]?.isPrimary).toBe(true);
    });

    it('lists no phones for a non-existent friend', async () => {
      const { app, testUser } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/friends/00000000-0000-0000-0000-000000000000/phones', {
          headers: authHeaders(testUser.sessionCookies),
        }),
      );

      // An unknown owner has no sub-resources; the list is simply empty.
      expect(response.status).toBe(200);
      expect(parseWith(PhoneResponseSchema.array(), await response.json())).toEqual([]);
    });

    it('returns 400 for a malformed JSON body', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Bad Body Friend');

      const response = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/phones`, {
          method: 'POST',
          headers: authHeaders(testUser.sessionCookies),
          body: 'not-json',
        }),
      );

      expect(response.status).toBe(400);
      expect(parseWith(ErrorResponseSchema, await response.json())).toMatchObject({
        error: 'Invalid JSON',
      });
    });

    it('returns 400 for a non-UUID friend id', async () => {
      const { app, testUser } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/friends/not-a-uuid/phones', {
          headers: authHeaders(testUser.sessionCookies),
        }),
      );

      expect(response.status).toBe(400);
      expect(parseWith(ErrorResponseSchema, await response.json())).toMatchObject({
        error: 'Invalid friend ID',
      });
    });

    it('deletes a phone from a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const addRequest = new Request(`http://localhost/api/friends/${friendId}/phones`, {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          phone_number: '+12125551234',
          phone_type: 'mobile',
        }),
      });

      const addResponse = await app.fetch(addRequest);
      const addBody = parseWith(PhoneResponseSchema, await addResponse.json());
      const phoneId = addBody.id;

      const deleteRequest = new Request(
        `http://localhost/api/friends/${friendId}/phones/${phoneId}`,
        {
          method: 'DELETE',
          headers: authHeaders(testUser.sessionCookies),
        },
      );

      const deleteResponse = await app.fetch(deleteRequest);

      expect(deleteResponse.status).toBe(200);

      const getRequest = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'GET',
        headers: authHeaders(testUser.sessionCookies),
      });

      const getResponse = await app.fetch(getRequest);
      const getBody = parseWith(FriendResponseSchema, await getResponse.json());

      expect(getBody.phones.length).toBe(0);
    });
  });

  describe('POST /api/friends/:id/emails', () => {
    it('adds an email to a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/emails`, {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          email_address: 'test@example.com',
          email_type: 'personal',
          is_primary: true,
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(EmailResponseSchema, await response.json());

      expect(response.status).toBe(201);
      expect(body.emailAddress).toBe('test@example.com');
      expect(body.emailType).toBe('personal');
      expect(body.isPrimary).toBe(true);
    });
  });

  describe('POST /api/friends/:id/addresses', () => {
    it('adds an address to a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/addresses`, {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          street_line1: '123 Main St',
          city: 'Anytown',
          state_province: 'CA',
          postal_code: '12345',
          country: 'US',
          address_type: 'home',
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(AddressResponseSchema, await response.json());

      expect(response.status).toBe(201);
      expect(body.streetLine1).toBe('123 Main St');
      expect(body.city).toBe('Anytown');
      expect(body.addressType).toBe('home');
    });

    it('rejects an address whose country is not an ISO code', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/addresses`, {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          city: 'Berlin',
          country: 'Germany',
          address_type: 'home',
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/friends/:id/urls', () => {
    it('adds a URL to a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/urls`, {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          url: 'https://example.com',
          url_type: 'personal',
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(UrlResponseSchema, await response.json());

      expect(response.status).toBe(201);
      expect(body.url).toBe('https://example.com');
      expect(body.urlType).toBe('personal');
    });
  });

  describe('GET /api/friends/:id across users', () => {
    it('returns 404 for a friend of another user', async () => {
      const { app, pool, testUser } = getContext();

      const otherUser = await createAuthenticatedUser(pool, 'other@example.com', 'Password123!');

      const friendId = await createTestFriend(pool, otherUser.externalId, 'Other User Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'GET',
        headers: authHeaders(testUser.sessionCookies),
      });

      const response = await app.fetch(request);

      // Another user's friend is indistinguishable from a missing one.
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/friends primary flags', () => {
    it('rejects multiple primary phones with 400', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Test Friend',
          phones: [
            { phone_number: '+14155551234', phone_type: 'mobile', is_primary: true },
            { phone_number: '+13105551234', phone_type: 'work', is_primary: true },
          ],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('rejects multiple primary emails with 400', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Test Friend',
          emails: [
            { email_address: 'test1@example.com', email_type: 'personal', is_primary: true },
            { email_address: 'test2@example.com', email_type: 'work', is_primary: true },
          ],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('rejects multiple primary addresses with 400', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Test Friend',
          addresses: [
            { street_line1: '123 Main St', address_type: 'home', is_primary: true },
            { street_line1: '456 Oak Ave', address_type: 'work', is_primary: true },
          ],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('accepts one primary per type', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Valid Friend',
          phones: [
            { phone_number: '+14155551234', phone_type: 'mobile', is_primary: true },
            { phone_number: '+13105551234', phone_type: 'work', is_primary: false },
          ],
          emails: [
            { email_address: 'primary@example.com', email_type: 'personal', is_primary: true },
            { email_address: 'secondary@example.com', email_type: 'work' },
          ],
        }),
      });

      const response = await app.fetch(request);
      const body = parseWith(FriendResponseSchema, await response.json());

      expect(response.status).toBe(201);
      expect(body.phones.length).toBe(2);
      expect(body.emails.length).toBe(2);
    });
  });

  describe('POST /api/friends sub-resource limits', () => {
    it('rejects more than 30 phones with 400', async () => {
      const { app, testUser } = getContext();

      const phones = Array.from({ length: 31 }, (_, index) => aPhoneInput(index));

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Too Many Phones',
          phones,
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('rejects more than 30 emails with 400', async () => {
      const { app, testUser } = getContext();

      const emails = Array.from({ length: 31 }, (_, index) => anEmailInput(index));

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Too Many Emails',
          emails,
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('rejects more than 30 urls with 400', async () => {
      const { app, testUser } = getContext();

      const urls = Array.from({ length: 31 }, (_, index) => aUrlInput(index));

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Too Many URLs',
          urls,
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('accepts exactly 30 phones', async () => {
      const { app, testUser } = getContext();

      const phones = Array.from({ length: 30 }, (_, index) => aPhoneInput(index));

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify({
          display_name: 'Max Phones Friend',
          phones,
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(201);
    });
  });

  describe('/api/friends/:id/photo', () => {
    it('returns 400 when no photo file is attached', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Photo Test');

      const request = new Request(`http://localhost/api/friends/${friendId}/photo`, {
        method: 'POST',
        headers: {
          Cookie: testUser.sessionCookies,
        },
        body: new FormData(),
      });

      const response = await app.fetch(request);
      const body = parseWith(ErrorResponseSchema, await response.json());

      expect(response.status).toBe(400);
      expect(body.error).toBe('No photo file provided');
    });

    it('returns 413 before buffering an oversized photo', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Photo Test');

      const formData = new FormData();
      // MAX_FILE_SIZE is 5 MiB; the route's bodyLimit allows 64 KiB of
      // multipart overhead on top, so 6 MiB is over the limit either way.
      const oversized = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/jpeg' });
      formData.append('photo', oversized, 'big.jpg');

      const request = new Request(`http://localhost/api/friends/${friendId}/photo`, {
        method: 'POST',
        headers: {
          Cookie: testUser.sessionCookies,
        },
        body: formData,
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(413);
    });

    it('returns 404 when uploading to a non-existent friend', async () => {
      const { app, testUser } = getContext();

      const formData = new FormData();
      const mockImageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      formData.append('photo', mockImageBlob, 'test.jpg');

      const request = new Request(
        'http://localhost/api/friends/00000000-0000-0000-0000-000000000000/photo',
        {
          method: 'POST',
          headers: {
            Cookie: testUser.sessionCookies,
          },
          body: formData,
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });

    it('rejects an unauthenticated upload with 401', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Photo Test');

      const formData = new FormData();
      const mockImageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      formData.append('photo', mockImageBlob, 'test.jpg');

      const request = new Request(`http://localhost/api/friends/${friendId}/photo`, {
        method: 'POST',
        body: formData,
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(401);
    });

    it('deletes the photo of an existing friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Photo Delete Test');

      const request = new Request(`http://localhost/api/friends/${friendId}/photo`, {
        method: 'DELETE',
        headers: authHeaders(testUser.sessionCookies),
      });

      const response = await app.fetch(request);
      const body = parseWith(MessageResponseSchema, await response.json());

      expect(response.status).toBe(200);
      expect(body.message).toBe('Photo deleted successfully');
    });

    it('rejects an unauthenticated delete with 401', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Photo Delete Test');

      const request = new Request(`http://localhost/api/friends/${friendId}/photo`, {
        method: 'DELETE',
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(401);
    });
  });
});
