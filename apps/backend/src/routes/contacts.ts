import {
  AddressInputSchema,
  ContactCreateSchema,
  ContactListQuerySchema,
  ContactUpdateSchema,
  EmailInputSchema,
  type ErrorResponse,
  PhoneInputSchema,
  PhotoValidationErrors,
  parseContactListQuery,
  UrlInputSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { contactsRateLimitMiddleware } from '../middleware/rate-limit.js';
import { ContactsService } from '../services/contacts.service.js';
import { PhotoService, PhotoUploadError } from '../services/photo.service.js';
import type { AppContext } from '../types/context.js';
import { isValidUuid } from '../utils/security.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all contact routes
app.use('*', authMiddleware);
// Apply rate limiting to all contact routes
app.use('*', contactsRateLimitMiddleware);

// ============================================================================
// Contact CRUD Routes
// ============================================================================

/**
 * GET /api/contacts
 * List contacts with pagination and sorting
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const queryParams = c.req.query();
    const validated = ContactListQuerySchema(queryParams);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
    }

    const options = parseContactListQuery(validated);
    const contactsService = new ContactsService(db, logger);
    const result = await contactsService.listContacts(user.userId, options);

    return c.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to list contacts');
    return c.json<ErrorResponse>({ error: 'Failed to list contacts' }, 500);
  }
});

/**
 * GET /api/contacts/:id
 * Get a single contact with all related data
 */
app.get('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  try {
    const contactsService = new ContactsService(db, logger);
    const contact = await contactsService.getContactById(user.userId, contactId);

    if (!contact) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(contact);
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to get contact');
    return c.json<ErrorResponse>({ error: 'Failed to get contact' }, 500);
  }
});

/**
 * POST /api/contacts
 * Create a new contact
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = ContactCreateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const contact = await contactsService.createContact(user.userId, validated);

    return c.json(contact, 201);
  } catch (error) {
    logger.error({ error }, 'Failed to create contact');
    return c.json<ErrorResponse>({ error: 'Failed to create contact' }, 500);
  }
});

/**
 * PUT /api/contacts/:id
 * Update an existing contact
 */
app.put('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = ContactUpdateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const contact = await contactsService.updateContact(user.userId, contactId, validated);

    if (!contact) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(contact);
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to update contact');
    return c.json<ErrorResponse>({ error: 'Failed to update contact' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id
 * Soft delete a contact
 */
app.delete('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteContact(user.userId, contactId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to delete contact');
    return c.json<ErrorResponse>({ error: 'Failed to delete contact' }, 500);
  }
});

// ============================================================================
// Phone Routes
// ============================================================================

/**
 * POST /api/contacts/:id/phones
 * Add a phone number to a contact
 */
app.post('/:id/phones', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = PhoneInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const phone = await contactsService.addPhone(user.userId, contactId, validated);

    if (!phone) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(phone, 201);
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to add phone');
    return c.json<ErrorResponse>({ error: 'Failed to add phone' }, 500);
  }
});

/**
 * PUT /api/contacts/:id/phones/:phoneId
 * Update a phone number
 */
app.put('/:id/phones/:phoneId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const phoneId = c.req.param('phoneId');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = PhoneInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const phone = await contactsService.updatePhone(user.userId, contactId, phoneId, validated);

    if (!phone) {
      return c.json<ErrorResponse>({ error: 'Phone not found' }, 404);
    }

    return c.json(phone);
  } catch (error) {
    logger.error({ error, contactId, phoneId }, 'Failed to update phone');
    return c.json<ErrorResponse>({ error: 'Failed to update phone' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/phones/:phoneId
 * Delete a phone number
 */
app.delete('/:id/phones/:phoneId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const phoneId = c.req.param('phoneId');

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deletePhone(user.userId, contactId, phoneId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Phone not found' }, 404);
    }

    return c.json({ message: 'Phone deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId, phoneId }, 'Failed to delete phone');
    return c.json<ErrorResponse>({ error: 'Failed to delete phone' }, 500);
  }
});

// ============================================================================
// Email Routes
// ============================================================================

/**
 * POST /api/contacts/:id/emails
 * Add an email address to a contact
 */
app.post('/:id/emails', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = EmailInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const email = await contactsService.addEmail(user.userId, contactId, validated);

    if (!email) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(email, 201);
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to add email');
    return c.json<ErrorResponse>({ error: 'Failed to add email' }, 500);
  }
});

/**
 * PUT /api/contacts/:id/emails/:emailId
 * Update an email address
 */
app.put('/:id/emails/:emailId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const emailId = c.req.param('emailId');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = EmailInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const email = await contactsService.updateEmail(user.userId, contactId, emailId, validated);

    if (!email) {
      return c.json<ErrorResponse>({ error: 'Email not found' }, 404);
    }

    return c.json(email);
  } catch (error) {
    logger.error({ error, contactId, emailId }, 'Failed to update email');
    return c.json<ErrorResponse>({ error: 'Failed to update email' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/emails/:emailId
 * Delete an email address
 */
app.delete('/:id/emails/:emailId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const emailId = c.req.param('emailId');

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteEmail(user.userId, contactId, emailId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Email not found' }, 404);
    }

    return c.json({ message: 'Email deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId, emailId }, 'Failed to delete email');
    return c.json<ErrorResponse>({ error: 'Failed to delete email' }, 500);
  }
});

// ============================================================================
// Address Routes
// ============================================================================

/**
 * POST /api/contacts/:id/addresses
 * Add an address to a contact
 */
app.post('/:id/addresses', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = AddressInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const address = await contactsService.addAddress(user.userId, contactId, validated);

    if (!address) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(address, 201);
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to add address');
    return c.json<ErrorResponse>({ error: 'Failed to add address' }, 500);
  }
});

/**
 * PUT /api/contacts/:id/addresses/:addressId
 * Update an address
 */
app.put('/:id/addresses/:addressId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const addressId = c.req.param('addressId');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = AddressInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const address = await contactsService.updateAddress(
      user.userId,
      contactId,
      addressId,
      validated,
    );

    if (!address) {
      return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
    }

    return c.json(address);
  } catch (error) {
    logger.error({ error, contactId, addressId }, 'Failed to update address');
    return c.json<ErrorResponse>({ error: 'Failed to update address' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/addresses/:addressId
 * Delete an address
 */
app.delete('/:id/addresses/:addressId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const addressId = c.req.param('addressId');

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteAddress(user.userId, contactId, addressId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
    }

    return c.json({ message: 'Address deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId, addressId }, 'Failed to delete address');
    return c.json<ErrorResponse>({ error: 'Failed to delete address' }, 500);
  }
});

// ============================================================================
// URL Routes
// ============================================================================

/**
 * POST /api/contacts/:id/urls
 * Add a URL to a contact
 */
app.post('/:id/urls', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = UrlInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const url = await contactsService.addUrl(user.userId, contactId, validated);

    if (!url) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(url, 201);
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to add URL');
    return c.json<ErrorResponse>({ error: 'Failed to add URL' }, 500);
  }
});

/**
 * PUT /api/contacts/:id/urls/:urlId
 * Update a URL
 */
app.put('/:id/urls/:urlId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const urlId = c.req.param('urlId');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = UrlInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const url = await contactsService.updateUrl(user.userId, contactId, urlId, validated);

    if (!url) {
      return c.json<ErrorResponse>({ error: 'URL not found' }, 404);
    }

    return c.json(url);
  } catch (error) {
    logger.error({ error, contactId, urlId }, 'Failed to update URL');
    return c.json<ErrorResponse>({ error: 'Failed to update URL' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/urls/:urlId
 * Delete a URL
 */
app.delete('/:id/urls/:urlId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const urlId = c.req.param('urlId');

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteUrl(user.userId, contactId, urlId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'URL not found' }, 404);
    }

    return c.json({ message: 'URL deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId, urlId }, 'Failed to delete URL');
    return c.json<ErrorResponse>({ error: 'Failed to delete URL' }, 500);
  }
});

// ============================================================================
// Photo Routes
// ============================================================================

/**
 * POST /api/contacts/:id/photo
 * Upload a profile photo
 */
app.post('/:id/photo', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  // Validate contactId is a valid UUID to prevent path traversal
  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('photo');

    if (!file || !(file instanceof File)) {
      return c.json<ErrorResponse>({ error: PhotoValidationErrors.NO_FILE_PROVIDED }, 400);
    }

    // Verify contact exists and belongs to user
    const contactsService = new ContactsService(db, logger);
    const contact = await contactsService.getContactById(user.userId, contactId);

    if (!contact) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    // Upload photo
    const photoService = new PhotoService(logger);
    const result = await photoService.uploadPhoto(contactId, file);

    // Update contact with photo URLs
    // If DB update fails, clean up the uploaded files to prevent orphaned files
    try {
      await contactsService.updatePhoto(
        user.userId,
        contactId,
        result.photoUrl,
        result.photoThumbnailUrl,
      );
    } catch (dbError) {
      // Clean up uploaded files since DB update failed
      logger.warn({ contactId }, 'DB update failed, cleaning up uploaded photo');
      try {
        await photoService.deletePhoto(contactId);
      } catch (cleanupError) {
        logger.error({ cleanupError, contactId }, 'Failed to clean up photo after DB error');
      }
      throw dbError;
    }

    return c.json(result, 201);
  } catch (error) {
    if (error instanceof PhotoUploadError) {
      return c.json<ErrorResponse>({ error: error.message }, 400);
    }

    logger.error({ error, contactId }, 'Failed to upload photo');
    return c.json<ErrorResponse>({ error: 'Failed to upload photo' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/photo
 * Delete a profile photo
 */
app.delete('/:id/photo', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  // Validate contactId is a valid UUID to prevent path traversal
  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

  try {
    const contactsService = new ContactsService(db, logger);
    const contact = await contactsService.getContactById(user.userId, contactId);

    if (!contact) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    // Delete photo files
    const photoService = new PhotoService(logger);
    await photoService.deletePhoto(contactId);

    // Clear photo URLs from contact
    await contactsService.updatePhoto(user.userId, contactId, null, null);

    return c.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to delete photo');
    return c.json<ErrorResponse>({ error: 'Failed to delete photo' }, 500);
  }
});

export default app;
