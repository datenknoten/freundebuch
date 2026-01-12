import { describe, expect, it } from 'vitest';
import {
  authHeaders,
  countUserFriends,
  createTestFriend,
  getTestFriend,
  setupFriendsTestSuite,
} from './friends.helpers.js';

describe('Friends API - Integration Tests', () => {
  const { getContext } = setupFriendsTestSuite();

  describe('GET /api/friends', () => {
    it('should return only self-profile when no other friends exist', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      // Self-profile is always present (created during onboarding)
      expect(body.friends.length).toBe(1);
      expect(body.friends[0].displayName).toBe('Test User (Self)');
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(25);
      expect(body.totalPages).toBe(1);
    });

    it('should return paginated friends list', async () => {
      const { app, pool, testUser } = getContext();

      // Create test friends (self-profile already exists from onboarding)
      await createTestFriend(pool, testUser.externalId, 'Alice');
      await createTestFriend(pool, testUser.externalId, 'Bob');
      await createTestFriend(pool, testUser.externalId, 'Charlie');

      const request = new Request('http://localhost/api/friends?page=1&pageSize=2', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.friends.length).toBe(2);
      // Total includes self-profile + 3 created friends
      expect(body.total).toBe(4);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(2);
      expect(body.totalPages).toBe(2);
    });

    it('should sort friends by display name', async () => {
      const { app, pool, testUser } = getContext();

      await createTestFriend(pool, testUser.externalId, 'Charlie');
      await createTestFriend(pool, testUser.externalId, 'Alice');
      await createTestFriend(pool, testUser.externalId, 'Bob');

      const request = new Request(
        'http://localhost/api/friends?sortBy=display_name&sortOrder=asc',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.friends[0].displayName).toBe('Alice');
      expect(body.friends[1].displayName).toBe('Bob');
      expect(body.friends[2].displayName).toBe('Charlie');
    });

    it('should require authentication', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'GET',
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/friends', () => {
    it('should create a friend with just display name', async () => {
      const { app, pool, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'John Doe',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body).toHaveProperty('id');
      expect(body.displayName).toBe('John Doe');
      expect(body.phones).toEqual([]);
      expect(body.emails).toEqual([]);
      expect(body.addresses).toEqual([]);
      expect(body.urls).toEqual([]);
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');

      // Verify in database (includes self-profile + new friend)
      const count = await countUserFriends(pool, testUser.externalId);
      expect(count).toBe(2);
    });

    it('should create a friend with full name parts', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
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
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body.displayName).toBe('Dr. John M. Smith Jr.');
      expect(body.namePrefix).toBe('Dr.');
      expect(body.nameFirst).toBe('John');
      expect(body.nameMiddle).toBe('M.');
      expect(body.nameLast).toBe('Smith');
      expect(body.nameSuffix).toBe('Jr.');
    });

    it('should create a friend with phones, emails, addresses, and urls', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
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
              country: 'USA',
              address_type: 'home',
              is_primary: true,
            },
          ],
          urls: [{ url: 'https://example.com', url_type: 'personal' }],
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body.phones.length).toBe(2);
      expect(body.phones[0].phoneNumber).toBe('+12125551234');
      expect(body.phones[0].isPrimary).toBe(true);
      expect(body.emails.length).toBe(1);
      expect(body.emails[0].emailAddress).toBe('test@example.com');
      expect(body.addresses.length).toBe(1);
      expect(body.addresses[0].city).toBe('Anytown');
      expect(body.urls.length).toBe(1);
      expect(body.urls[0].url).toBe('https://example.com');
    });

    it('should reject invalid email format', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Test Friend',
          emails: [{ email_address: 'invalid-email', email_type: 'personal' }],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should reject empty display name', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: '',
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/friends/:id', () => {
    it('should return a friend with all related data', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'John Doe');

      // Add phone directly in database
      await pool.query(
        `INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
         SELECT c.id, '+12125551234', 'mobile', true
         FROM friends.friends c WHERE c.external_id = $1`,
        [friendId],
      );

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe(friendId);
      expect(body.displayName).toBe('John Doe');
      expect(body.phones.length).toBe(1);
      expect(body.phones[0].phoneNumber).toBe('+12125551234');
    });

    it('should return 404 for non-existent friend', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/friends/00000000-0000-0000-0000-000000000000',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/friends/:id', () => {
    it('should update friend display name', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Old Name');

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'PUT',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'New Name',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.displayName).toBe('New Name');

      // Verify in database
      const friend = await getTestFriend(pool, friendId);
      expect(friend?.displayName).toBe('New Name');
    });

    it('should update name parts to null', async () => {
      const { app, pool, testUser } = getContext();

      // Create friend with name parts
      const friendId = await createTestFriend(pool, testUser.externalId, 'Dr. John Smith');
      await pool.query("UPDATE friends.friends SET name_prefix = 'Dr.' WHERE external_id = $1", [
        friendId,
      ]);

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'PUT',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          name_prefix: null,
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.namePrefix).toBeUndefined();
    });

    it('should return 404 for non-existent friend', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/friends/00000000-0000-0000-0000-000000000000',
        {
          method: 'PUT',
          headers: authHeaders(testUser.accessToken),
          body: JSON.stringify({ display_name: 'Test' }),
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/friends/:id', () => {
    it('should soft delete a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'To Be Deleted');

      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Friend deleted successfully');

      // Verify soft delete in database
      const friend = await getTestFriend(pool, friendId);
      expect(friend?.deletedAt).not.toBeNull();

      // Should not appear in list (only self-profile remains)
      const listRequest = new Request('http://localhost/api/friends', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const listResponse = await app.fetch(listRequest);
      const listBody: any = await listResponse.json();

      expect(listBody.friends.length).toBe(1);
      expect(listBody.friends[0].displayName).toBe('Test User (Self)');
    });

    it('should return 404 for non-existent friend', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/friends/00000000-0000-0000-0000-000000000000',
        {
          method: 'DELETE',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });
  });

  describe('Phone Sub-resource Routes', () => {
    it('should add a phone to a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/phones`, {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          phone_number: '+12125551234',
          phone_type: 'mobile',
          is_primary: true,
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body).toHaveProperty('id');
      expect(body.phoneNumber).toBe('+12125551234');
      expect(body.phoneType).toBe('mobile');
      expect(body.isPrimary).toBe(true);
    });

    it('should delete a phone from a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      // Add phone
      const addRequest = new Request(`http://localhost/api/friends/${friendId}/phones`, {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          phone_number: '+12125551234',
          phone_type: 'mobile',
        }),
      });

      const addResponse = await app.fetch(addRequest);
      const addBody: any = await addResponse.json();
      const phoneId = addBody.id;

      // Delete phone
      const deleteRequest = new Request(
        `http://localhost/api/friends/${friendId}/phones/${phoneId}`,
        {
          method: 'DELETE',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const deleteResponse = await app.fetch(deleteRequest);

      expect(deleteResponse.status).toBe(200);

      // Verify phone is gone
      const getRequest = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const getResponse = await app.fetch(getRequest);
      const getBody: any = await getResponse.json();

      expect(getBody.phones.length).toBe(0);
    });
  });

  describe('Email Sub-resource Routes', () => {
    it('should add an email to a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/emails`, {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          email_address: 'test@example.com',
          email_type: 'personal',
          is_primary: true,
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body.emailAddress).toBe('test@example.com');
      expect(body.emailType).toBe('personal');
      expect(body.isPrimary).toBe(true);
    });
  });

  describe('Address Sub-resource Routes', () => {
    it('should add an address to a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/addresses`, {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          street_line1: '123 Main St',
          city: 'Anytown',
          state_province: 'CA',
          postal_code: '12345',
          country: 'USA',
          address_type: 'home',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body.streetLine1).toBe('123 Main St');
      expect(body.city).toBe('Anytown');
      expect(body.addressType).toBe('home');
    });
  });

  describe('URL Sub-resource Routes', () => {
    it('should add a URL to a friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Test Friend');

      const request = new Request(`http://localhost/api/friends/${friendId}/urls`, {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          url: 'https://example.com',
          url_type: 'personal',
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body.url).toBe('https://example.com');
      expect(body.urlType).toBe('personal');
    });
  });

  describe('Authorization', () => {
    it('should not allow accessing another user friends', async () => {
      const { app, pool, testUser } = getContext();
      const { createAuthenticatedUser } = await import('./friends.helpers.js');

      // Create another user
      const otherUser = await createAuthenticatedUser(pool, 'other@example.com', 'Password123!');

      // Create friend for other user
      const friendId = await createTestFriend(pool, otherUser.externalId, 'Other User Friend');

      // Try to access with testUser's token
      const request = new Request(`http://localhost/api/friends/${friendId}`, {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(404); // Not found because it belongs to another user
    });
  });

  describe('Multiple Primary Validation', () => {
    it('should reject friend creation with multiple primary phones', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
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

    it('should reject friend creation with multiple primary emails', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
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

    it('should reject friend creation with multiple primary addresses', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
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

    it('should allow friend creation with one primary per type', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
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
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body.phones.length).toBe(2);
      expect(body.emails.length).toBe(2);
    });
  });

  describe('Sub-resource Limit Validation', () => {
    it('should reject friend creation with more than 30 phones', async () => {
      const { app, testUser } = getContext();

      // Generate 31 valid phone numbers
      const phones = Array.from({ length: 31 }, (_, i) => ({
        phone_number: `+1212555${String(1000 + i).padStart(4, '0')}`,
        phone_type: 'mobile' as const,
      }));

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Too Many Phones',
          phones,
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should reject friend creation with more than 30 emails', async () => {
      const { app, testUser } = getContext();

      // Generate 31 emails
      const emails = Array.from({ length: 31 }, (_, i) => ({
        email_address: `test${i}@example.com`,
        email_type: 'personal' as const,
      }));

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Too Many Emails',
          emails,
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should reject friend creation with more than 30 urls', async () => {
      const { app, testUser } = getContext();

      // Generate 31 URLs
      const urls = Array.from({ length: 31 }, (_, i) => ({
        url: `https://example${i}.com`,
        url_type: 'personal' as const,
      }));

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Too Many URLs',
          urls,
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should allow friend creation with exactly 30 phones', async () => {
      const { app, testUser } = getContext();

      // Generate exactly 30 valid phone numbers
      const phones = Array.from({ length: 30 }, (_, i) => ({
        phone_number: `+1212555${String(1000 + i).padStart(4, '0')}`,
        phone_type: 'mobile' as const,
      }));

      const request = new Request('http://localhost/api/friends', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Max Phones Friend',
          phones,
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(201);
    });
  });

  describe('Photo Routes', () => {
    it('should return 400 for missing photo file', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Photo Test');

      const formData = new FormData();
      // No photo attached

      const request = new Request(`http://localhost/api/friends/${friendId}/photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testUser.accessToken}`,
        },
        body: formData,
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('No photo file provided');
    });

    it('should return 404 for photo upload to non-existent friend', async () => {
      const { app, testUser } = getContext();

      const formData = new FormData();
      const mockImageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      formData.append('photo', mockImageBlob, 'test.jpg');

      const request = new Request(
        'http://localhost/api/friends/00000000-0000-0000-0000-000000000000/photo',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testUser.accessToken}`,
          },
          body: formData,
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });

    it('should require authentication for photo upload', async () => {
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

    it('should delete photo for existing friend', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Photo Delete Test');

      const request = new Request(`http://localhost/api/friends/${friendId}/photo`, {
        method: 'DELETE',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Photo deleted successfully');
    });

    it('should require authentication for photo delete', async () => {
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
