import { describe, expect, it } from 'vitest';
import {
  authHeaders,
  countUserContacts,
  createTestContact,
  getTestContact,
  setupContactsTestSuite,
} from './contacts.helpers.js';

describe('Contacts API - Integration Tests', () => {
  const { getContext } = setupContactsTestSuite();

  describe('GET /api/contacts', () => {
    it('should return empty list when no contacts exist', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.contacts).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(25);
      expect(body.totalPages).toBe(0);
    });

    it('should return paginated contacts list', async () => {
      const { app, pool, testUser } = getContext();

      // Create test contacts
      await createTestContact(pool, testUser.externalId, 'Alice');
      await createTestContact(pool, testUser.externalId, 'Bob');
      await createTestContact(pool, testUser.externalId, 'Charlie');

      const request = new Request('http://localhost/api/contacts?page=1&pageSize=2', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.contacts.length).toBe(2);
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(2);
      expect(body.totalPages).toBe(2);
    });

    it('should sort contacts by display name', async () => {
      const { app, pool, testUser } = getContext();

      await createTestContact(pool, testUser.externalId, 'Charlie');
      await createTestContact(pool, testUser.externalId, 'Alice');
      await createTestContact(pool, testUser.externalId, 'Bob');

      const request = new Request(
        'http://localhost/api/contacts?sortBy=display_name&sortOrder=asc',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.contacts[0].displayName).toBe('Alice');
      expect(body.contacts[1].displayName).toBe('Bob');
      expect(body.contacts[2].displayName).toBe('Charlie');
    });

    it('should require authentication', async () => {
      const { app } = getContext();

      const request = new Request('http://localhost/api/contacts', {
        method: 'GET',
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/contacts', () => {
    it('should create a contact with just display name', async () => {
      const { app, pool, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
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

      // Verify in database
      const count = await countUserContacts(pool, testUser.externalId);
      expect(count).toBe(1);
    });

    it('should create a contact with full name parts', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
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

    it('should create a contact with phones, emails, addresses, and urls', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Full Contact',
          phones: [
            { phone_number: '+1234567890', phone_type: 'mobile', is_primary: true },
            { phone_number: '+0987654321', phone_type: 'work', label: 'Office' },
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
      expect(body.phones[0].phoneNumber).toBe('+1234567890');
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

      const request = new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Test Contact',
          emails: [{ email_address: 'invalid-email', email_type: 'personal' }],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should reject empty display name', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
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

  describe('GET /api/contacts/:id', () => {
    it('should return a contact with all related data', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'John Doe');

      // Add phone directly in database
      await pool.query(
        `INSERT INTO contacts.contact_phones (contact_id, phone_number, phone_type, is_primary)
         SELECT c.id, '+1234567890', 'mobile', true
         FROM contacts.contacts c WHERE c.external_id = $1`,
        [contactId],
      );

      const request = new Request(`http://localhost/api/contacts/${contactId}`, {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe(contactId);
      expect(body.displayName).toBe('John Doe');
      expect(body.phones.length).toBe(1);
      expect(body.phones[0].phoneNumber).toBe('+1234567890');
    });

    it('should return 404 for non-existent contact', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/contacts/00000000-0000-0000-0000-000000000000',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update contact display name', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'Old Name');

      const request = new Request(`http://localhost/api/contacts/${contactId}`, {
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
      const contact = await getTestContact(pool, contactId);
      expect(contact?.displayName).toBe('New Name');
    });

    it('should update name parts to null', async () => {
      const { app, pool, testUser } = getContext();

      // Create contact with name parts
      const contactId = await createTestContact(pool, testUser.externalId, 'Dr. John Smith');
      await pool.query("UPDATE contacts.contacts SET name_prefix = 'Dr.' WHERE external_id = $1", [
        contactId,
      ]);

      const request = new Request(`http://localhost/api/contacts/${contactId}`, {
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

    it('should return 404 for non-existent contact', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/contacts/00000000-0000-0000-0000-000000000000',
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

  describe('DELETE /api/contacts/:id', () => {
    it('should soft delete a contact', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'To Be Deleted');

      const request = new Request(`http://localhost/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Contact deleted successfully');

      // Verify soft delete in database
      const contact = await getTestContact(pool, contactId);
      expect(contact?.deletedAt).not.toBeNull();

      // Should not appear in list
      const listRequest = new Request('http://localhost/api/contacts', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const listResponse = await app.fetch(listRequest);
      const listBody: any = await listResponse.json();

      expect(listBody.contacts.length).toBe(0);
    });

    it('should return 404 for non-existent contact', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/contacts/00000000-0000-0000-0000-000000000000',
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
    it('should add a phone to a contact', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'Test Contact');

      const request = new Request(`http://localhost/api/contacts/${contactId}/phones`, {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          phone_number: '+1234567890',
          phone_type: 'mobile',
          is_primary: true,
        }),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(201);
      expect(body).toHaveProperty('id');
      expect(body.phoneNumber).toBe('+1234567890');
      expect(body.phoneType).toBe('mobile');
      expect(body.isPrimary).toBe(true);
    });

    it('should delete a phone from a contact', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'Test Contact');

      // Add phone
      const addRequest = new Request(`http://localhost/api/contacts/${contactId}/phones`, {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          phone_number: '+1234567890',
          phone_type: 'mobile',
        }),
      });

      const addResponse = await app.fetch(addRequest);
      const addBody: any = await addResponse.json();
      const phoneId = addBody.id;

      // Delete phone
      const deleteRequest = new Request(
        `http://localhost/api/contacts/${contactId}/phones/${phoneId}`,
        {
          method: 'DELETE',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const deleteResponse = await app.fetch(deleteRequest);

      expect(deleteResponse.status).toBe(200);

      // Verify phone is gone
      const getRequest = new Request(`http://localhost/api/contacts/${contactId}`, {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const getResponse = await app.fetch(getRequest);
      const getBody: any = await getResponse.json();

      expect(getBody.phones.length).toBe(0);
    });
  });

  describe('Email Sub-resource Routes', () => {
    it('should add an email to a contact', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'Test Contact');

      const request = new Request(`http://localhost/api/contacts/${contactId}/emails`, {
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
    it('should add an address to a contact', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'Test Contact');

      const request = new Request(`http://localhost/api/contacts/${contactId}/addresses`, {
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
    it('should add a URL to a contact', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'Test Contact');

      const request = new Request(`http://localhost/api/contacts/${contactId}/urls`, {
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
    it('should not allow accessing another user contacts', async () => {
      const { app, pool, testUser } = getContext();
      const { createAuthenticatedUser } = await import('./contacts.helpers.js');

      // Create another user
      const otherUser = await createAuthenticatedUser(pool, 'other@example.com', 'Password123!');

      // Create contact for other user
      const contactId = await createTestContact(pool, otherUser.externalId, 'Other User Contact');

      // Try to access with testUser's token
      const request = new Request(`http://localhost/api/contacts/${contactId}`, {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(404); // Not found because it belongs to another user
    });
  });

  describe('Multiple Primary Validation', () => {
    it('should reject contact creation with multiple primary phones', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Test Contact',
          phones: [
            { phone_number: '+1111111111', phone_type: 'mobile', is_primary: true },
            { phone_number: '+2222222222', phone_type: 'work', is_primary: true },
          ],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should reject contact creation with multiple primary emails', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Test Contact',
          emails: [
            { email_address: 'test1@example.com', email_type: 'personal', is_primary: true },
            { email_address: 'test2@example.com', email_type: 'work', is_primary: true },
          ],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should reject contact creation with multiple primary addresses', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Test Contact',
          addresses: [
            { street_line1: '123 Main St', address_type: 'home', is_primary: true },
            { street_line1: '456 Oak Ave', address_type: 'work', is_primary: true },
          ],
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should allow contact creation with one primary per type', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: authHeaders(testUser.accessToken),
        body: JSON.stringify({
          display_name: 'Valid Contact',
          phones: [
            { phone_number: '+1111111111', phone_type: 'mobile', is_primary: true },
            { phone_number: '+2222222222', phone_type: 'work', is_primary: false },
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

  describe('Photo Routes', () => {
    it('should return 400 for missing photo file', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'Photo Test');

      const formData = new FormData();
      // No photo attached

      const request = new Request(`http://localhost/api/contacts/${contactId}/photo`, {
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

    it('should return 404 for photo upload to non-existent contact', async () => {
      const { app, testUser } = getContext();

      const formData = new FormData();
      const mockImageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      formData.append('photo', mockImageBlob, 'test.jpg');

      const request = new Request(
        'http://localhost/api/contacts/00000000-0000-0000-0000-000000000000/photo',
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

      const contactId = await createTestContact(pool, testUser.externalId, 'Photo Test');

      const formData = new FormData();
      const mockImageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      formData.append('photo', mockImageBlob, 'test.jpg');

      const request = new Request(`http://localhost/api/contacts/${contactId}/photo`, {
        method: 'POST',
        body: formData,
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(401);
    });

    it('should delete photo for existing contact', async () => {
      const { app, pool, testUser } = getContext();

      const contactId = await createTestContact(pool, testUser.externalId, 'Photo Delete Test');

      const request = new Request(`http://localhost/api/contacts/${contactId}/photo`, {
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

      const contactId = await createTestContact(pool, testUser.externalId, 'Photo Delete Test');

      const request = new Request(`http://localhost/api/contacts/${contactId}/photo`, {
        method: 'DELETE',
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(401);
    });
  });
});
