import {
  AddressInputSchema,
  ContactCreateSchema,
  ContactListQuerySchema,
  ContactUpdateSchema,
  DateInputSchema,
  EmailInputSchema,
  type ErrorResponse,
  MetInfoInputSchema,
  PhoneInputSchema,
  PhotoValidationErrors,
  parseContactListQuery,
  RelationshipInputSchema,
  RelationshipUpdateSchema,
  SocialProfileInputSchema,
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
 * GET /api/contacts/search
 * Search contacts by name (for autocomplete)
 * NOTE: This must be defined before /:id to avoid being caught by the wildcard
 */
app.get('/search', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const query = c.req.query('q');
  const exclude = c.req.query('exclude');
  const limitParam = c.req.query('limit');

  if (!query || query.trim().length === 0) {
    return c.json<ErrorResponse>({ error: 'Query parameter "q" is required' }, 400);
  }

  if (exclude && !isValidUuid(exclude)) {
    return c.json<ErrorResponse>({ error: 'Invalid exclude parameter' }, 400);
  }

  const limit = limitParam ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 10)) : 10;

  try {
    const contactsService = new ContactsService(db, logger);
    const results = await contactsService.searchContacts(user.userId, query.trim(), exclude, limit);

    return c.json(results);
  } catch (error) {
    logger.error({ error, query }, 'Failed to search contacts');
    return c.json<ErrorResponse>({ error: 'Failed to search contacts' }, 500);
  }
});

/**
 * GET /api/contacts/relationship-types
 * Get all relationship types grouped by category
 * NOTE: This must be defined before /:id to avoid being caught by the wildcard
 */
app.get('/relationship-types', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const contactsService = new ContactsService(db, logger);
    const types = await contactsService.getRelationshipTypes();

    return c.json(types);
  } catch (error) {
    logger.error({ error }, 'Failed to get relationship types');
    return c.json<ErrorResponse>({ error: 'Failed to get relationship types' }, 500);
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
 * Soft delete a contact and remove associated photo files
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

    // Delete photo files from disk (best effort - don't fail if photos don't exist)
    try {
      const photoService = new PhotoService(logger);
      await photoService.deletePhoto(contactId);
    } catch (photoError) {
      logger.warn({ error: photoError, contactId }, 'Failed to delete contact photos');
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

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

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

  if (!isValidUuid(contactId) || !isValidUuid(phoneId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

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

  if (!isValidUuid(contactId) || !isValidUuid(phoneId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

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

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

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

  if (!isValidUuid(contactId) || !isValidUuid(emailId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

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

  if (!isValidUuid(contactId) || !isValidUuid(emailId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

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

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

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

  if (!isValidUuid(contactId) || !isValidUuid(addressId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

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

  if (!isValidUuid(contactId) || !isValidUuid(addressId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

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

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

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

  if (!isValidUuid(contactId) || !isValidUuid(urlId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

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

  if (!isValidUuid(contactId) || !isValidUuid(urlId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

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

// ============================================================================
// Date Routes (Epic 1B)
// ============================================================================

/**
 * POST /api/contacts/:id/dates
 * Add an important date to a contact
 */
app.post('/:id/dates', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = DateInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const date = await contactsService.addDate(user.userId, contactId, validated);

    if (!date) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(date, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Contact already has a birthday date') {
      return c.json<ErrorResponse>({ error: error.message }, 400);
    }
    logger.error({ error, contactId }, 'Failed to add date');
    return c.json<ErrorResponse>({ error: 'Failed to add date' }, 500);
  }
});

/**
 * PUT /api/contacts/:id/dates/:dateId
 * Update an important date
 */
app.put('/:id/dates/:dateId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const dateId = c.req.param('dateId');

  if (!isValidUuid(contactId) || !isValidUuid(dateId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = DateInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const date = await contactsService.updateDate(user.userId, contactId, dateId, validated);

    if (!date) {
      return c.json<ErrorResponse>({ error: 'Date not found' }, 404);
    }

    return c.json(date);
  } catch (error) {
    logger.error({ error, contactId, dateId }, 'Failed to update date');
    return c.json<ErrorResponse>({ error: 'Failed to update date' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/dates/:dateId
 * Delete an important date
 */
app.delete('/:id/dates/:dateId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const dateId = c.req.param('dateId');

  if (!isValidUuid(contactId) || !isValidUuid(dateId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteDate(user.userId, contactId, dateId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Date not found' }, 404);
    }

    return c.json({ message: 'Date deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId, dateId }, 'Failed to delete date');
    return c.json<ErrorResponse>({ error: 'Failed to delete date' }, 500);
  }
});

// ============================================================================
// Met Info Routes (Epic 1B)
// ============================================================================

/**
 * PUT /api/contacts/:id/met-info
 * Set or update how/where met information (upsert)
 */
app.put('/:id/met-info', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = MetInfoInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const metInfo = await contactsService.setMetInfo(user.userId, contactId, validated);

    if (!metInfo) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(metInfo);
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to set met info');
    return c.json<ErrorResponse>({ error: 'Failed to set met info' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/met-info
 * Delete how/where met information
 */
app.delete('/:id/met-info', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteMetInfo(user.userId, contactId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Met info not found' }, 404);
    }

    return c.json({ message: 'Met info deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to delete met info');
    return c.json<ErrorResponse>({ error: 'Failed to delete met info' }, 500);
  }
});

// ============================================================================
// Social Profile Routes (Epic 1B)
// ============================================================================

/**
 * POST /api/contacts/:id/social-profiles
 * Add a social profile to a contact
 */
app.post('/:id/social-profiles', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = SocialProfileInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const profile = await contactsService.addSocialProfile(user.userId, contactId, validated);

    if (!profile) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(profile, 201);
  } catch (error) {
    logger.error({ error, contactId }, 'Failed to add social profile');
    return c.json<ErrorResponse>({ error: 'Failed to add social profile' }, 500);
  }
});

/**
 * PUT /api/contacts/:id/social-profiles/:profileId
 * Update a social profile
 */
app.put('/:id/social-profiles/:profileId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const profileId = c.req.param('profileId');

  if (!isValidUuid(contactId) || !isValidUuid(profileId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = SocialProfileInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const profile = await contactsService.updateSocialProfile(
      user.userId,
      contactId,
      profileId,
      validated,
    );

    if (!profile) {
      return c.json<ErrorResponse>({ error: 'Social profile not found' }, 404);
    }

    return c.json(profile);
  } catch (error) {
    logger.error({ error, contactId, profileId }, 'Failed to update social profile');
    return c.json<ErrorResponse>({ error: 'Failed to update social profile' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/social-profiles/:profileId
 * Delete a social profile
 */
app.delete('/:id/social-profiles/:profileId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const profileId = c.req.param('profileId');

  if (!isValidUuid(contactId) || !isValidUuid(profileId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteSocialProfile(user.userId, contactId, profileId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Social profile not found' }, 404);
    }

    return c.json({ message: 'Social profile deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId, profileId }, 'Failed to delete social profile');
    return c.json<ErrorResponse>({ error: 'Failed to delete social profile' }, 500);
  }
});

// ============================================================================
// Relationship Routes (Epic 1D)
// ============================================================================

/**
 * POST /api/contacts/:id/relationships
 * Add a relationship to a contact (creates inverse automatically)
 */
app.post('/:id/relationships', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');

  if (!isValidUuid(contactId)) {
    return c.json<ErrorResponse>({ error: 'Invalid contact ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = RelationshipInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    // Validate related_contact_id is a valid UUID
    if (!isValidUuid(validated.related_contact_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid related contact ID' }, 400);
    }

    // Prevent self-relationships
    if (validated.related_contact_id === contactId) {
      return c.json<ErrorResponse>({ error: 'Cannot create relationship with self' }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const relationship = await contactsService.addRelationship(user.userId, contactId, validated);

    if (!relationship) {
      return c.json<ErrorResponse>({ error: 'Contact not found' }, 404);
    }

    return c.json(relationship, 201);
  } catch (error) {
    // Handle unique constraint violation (duplicate relationship)
    if (error instanceof Error && error.message.includes('unique_relationship')) {
      return c.json<ErrorResponse>({ error: 'Relationship already exists' }, 409);
    }
    logger.error({ error, contactId }, 'Failed to add relationship');
    return c.json<ErrorResponse>({ error: 'Failed to add relationship' }, 500);
  }
});

/**
 * PUT /api/contacts/:id/relationships/:relationshipId
 * Update a relationship's notes
 */
app.put('/:id/relationships/:relationshipId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const relationshipId = c.req.param('relationshipId');

  if (!isValidUuid(contactId) || !isValidUuid(relationshipId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = RelationshipUpdateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    const relationship = await contactsService.updateRelationship(
      user.userId,
      contactId,
      relationshipId,
      validated,
    );

    if (!relationship) {
      return c.json<ErrorResponse>({ error: 'Relationship not found' }, 404);
    }

    return c.json(relationship);
  } catch (error) {
    logger.error({ error, contactId, relationshipId }, 'Failed to update relationship');
    return c.json<ErrorResponse>({ error: 'Failed to update relationship' }, 500);
  }
});

/**
 * DELETE /api/contacts/:id/relationships/:relationshipId
 * Delete a relationship (and its inverse)
 */
app.delete('/:id/relationships/:relationshipId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const contactId = c.req.param('id');
  const relationshipId = c.req.param('relationshipId');

  if (!isValidUuid(contactId) || !isValidUuid(relationshipId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteRelationship(
      user.userId,
      contactId,
      relationshipId,
    );

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Relationship not found' }, 404);
    }

    return c.json({ message: 'Relationship deleted successfully' });
  } catch (error) {
    logger.error({ error, contactId, relationshipId }, 'Failed to delete relationship');
    return c.json<ErrorResponse>({ error: 'Failed to delete relationship' }, 500);
  }
});

export default app;
