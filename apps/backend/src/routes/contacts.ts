import {
  AddressInputSchema,
  ContactCreateSchema,
  ContactListQuerySchema,
  ContactUpdateSchema,
  DateInputSchema,
  EmailInputSchema,
  type ErrorResponse,
  FacetedSearchQuerySchema,
  MetInfoInputSchema,
  PhoneInputSchema,
  PhotoValidationErrors,
  parseContactListQuery,
  parseFacetedSearchQuery,
  parseSearchQuery,
  RelationshipInputSchema,
  RelationshipUpdateSchema,
  SearchQuerySchema,
  SocialProfileInputSchema,
  UrlInputSchema,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { contactsRateLimitMiddleware } from '../middleware/rate-limit.js';
import { ContactsService, DuplicateBirthdayError } from '../services/contacts.service.js';
import { PhotoService, PhotoUploadError } from '../services/photo.service.js';
import type { AppContext } from '../types/context.js';
import { isAppError } from '../utils/errors.js';
import { isValidUuid } from '../utils/security.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all contact routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require self-contact before using contacts
app.use('*', onboardingMiddleware);
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
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list contacts');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to list contacts');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, query }, 'Failed to search contacts');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to search contacts' }, 500);
  }
});

// ============================================================================
// Epic 10: Full-Text Search Routes
// ============================================================================

/**
 * GET /api/contacts/search/full
 * Full-text search across contacts with relevance ranking
 * Searches: names, organization, job title, work notes, emails, phones,
 * relationship notes, and met context
 */
app.get('/search/full', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const query = c.req.query('q');
  const limitParam = c.req.query('limit');

  if (!query || query.trim().length === 0) {
    return c.json<ErrorResponse>({ error: 'Query parameter "q" is required' }, 400);
  }

  // Minimum query length for performance
  if (query.trim().length < 2) {
    return c.json<ErrorResponse>({ error: 'Query must be at least 2 characters' }, 400);
  }

  const limit = limitParam ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 10)) : 10;

  try {
    const contactsService = new ContactsService(db, logger);
    const results = await contactsService.fullTextSearch(user.userId, query.trim(), limit);

    return c.json(results);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, query }, 'Failed to search contacts');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to search contacts' }, 500);
  }
});

/**
 * GET /api/contacts/search/paginated
 * Paginated full-text search with sorting options
 * Used by in-page search for contacts list
 */
app.get('/search/paginated', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const queryParams = c.req.query();
    const validated = SearchQuerySchema(queryParams);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
    }

    // Minimum query length for performance
    if (validated.q.trim().length < 2) {
      return c.json<ErrorResponse>({ error: 'Query must be at least 2 characters' }, 400);
    }

    const options = parseSearchQuery(validated);
    const contactsService = new ContactsService(db, logger);
    const results = await contactsService.paginatedSearch(user.userId, options);

    return c.json(results);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to search contacts');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to search contacts' }, 500);
  }
});

/**
 * GET /api/contacts/search/faceted
 * Faceted full-text search with filter support and optional facet aggregation
 * Supports filtering by location, professional, and relationship facets
 * Can be used with a search query, filters, or both
 */
app.get('/search/faceted', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const queryParams = c.req.query();
    const validated = FacetedSearchQuerySchema(queryParams);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
    }

    // Check if we have a valid search query
    const hasQuery = validated.q && validated.q.trim().length >= 2;

    // Check if we have any active filters
    const hasFilters =
      validated.country ||
      validated.city ||
      validated.organization ||
      validated.job_title ||
      validated.department ||
      validated.relationship_category;

    // Require at least a query, filters, or includeFacets
    if (!hasQuery && !hasFilters && validated.includeFacets !== 'true') {
      return c.json<ErrorResponse>(
        {
          error:
            'Either a search query (2+ characters), filters, or includeFacets=true is required',
        },
        400,
      );
    }

    const options = parseFacetedSearchQuery(validated);
    const contactsService = new ContactsService(db, logger);

    // Use appropriate method based on whether query is present
    // filterOnlyList handles both filter-only and facets-only requests
    const results = hasQuery
      ? await contactsService.facetedSearch(user.userId, options)
      : await contactsService.filterOnlyList(user.userId, options);

    return c.json(results);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to perform faceted search');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to perform faceted search' }, 500);
  }
});

/**
 * GET /api/contacts/search/recent
 * Get user's recent search queries
 */
app.get('/search/recent', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const limitParam = c.req.query('limit');
  const limit = limitParam ? Math.min(20, Math.max(1, Number.parseInt(limitParam, 10) || 10)) : 10;

  try {
    const contactsService = new ContactsService(db, logger);
    const recentSearches = await contactsService.getRecentSearches(user.userId, limit);

    return c.json(recentSearches);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to get recent searches');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get recent searches' }, 500);
  }
});

/**
 * POST /api/contacts/search/recent
 * Add or update a recent search query
 */
app.post('/search/recent', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const body = await c.req.json();
    const query = body?.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return c.json<ErrorResponse>({ error: 'Query is required' }, 400);
    }

    if (query.trim().length < 2) {
      return c.json<ErrorResponse>({ error: 'Query must be at least 2 characters' }, 400);
    }

    const contactsService = new ContactsService(db, logger);
    await contactsService.addRecentSearch(user.userId, query.trim());

    return c.json({ success: true }, 201);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to add recent search');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add recent search' }, 500);
  }
});

/**
 * DELETE /api/contacts/search/recent/:query
 * Delete a specific recent search
 */
app.delete('/search/recent/:query', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const query = decodeURIComponent(c.req.param('query'));

  try {
    const contactsService = new ContactsService(db, logger);
    const deleted = await contactsService.deleteRecentSearch(user.userId, query);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Search query not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, query }, 'Failed to delete recent search');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete recent search' }, 500);
  }
});

/**
 * DELETE /api/contacts/search/recent
 * Clear all recent searches
 */
app.delete('/search/recent', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const contactsService = new ContactsService(db, logger);
    await contactsService.clearRecentSearches(user.userId);

    return c.json({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to clear recent searches');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to clear recent searches' }, 500);
  }
});

// ============================================================================
// Dashboard Routes
// ============================================================================

/**
 * GET /api/contacts/dates/upcoming
 * Get upcoming important dates across all contacts
 * Query params: days (default 30), limit (default 10)
 * NOTE: This must be defined before /:id to avoid being caught by the wildcard
 */
app.get('/dates/upcoming', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const daysParam = c.req.query('days');
  const limitParam = c.req.query('limit');

  const days = daysParam ? Math.min(365, Math.max(1, Number.parseInt(daysParam, 10) || 30)) : 30;
  const limit = limitParam ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 10)) : 10;

  try {
    const contactsService = new ContactsService(db, logger);
    const upcomingDates = await contactsService.getUpcomingDates(user.userId, { days, limit });

    return c.json(upcomingDates);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to get upcoming dates');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get upcoming dates' }, 500);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to get relationship types');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to get contact');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to create contact');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to update contact');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to delete contact');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to add phone');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, phoneId }, 'Failed to update phone');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, phoneId }, 'Failed to delete phone');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to add email');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, emailId }, 'Failed to update email');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, emailId }, 'Failed to delete email');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to add address');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, addressId }, 'Failed to update address');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, addressId }, 'Failed to delete address');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to add URL');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, urlId }, 'Failed to update URL');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, urlId }, 'Failed to delete URL');
    Sentry.captureException(err);
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

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to upload photo');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to delete photo');
    Sentry.captureException(err);
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
    if (error instanceof DuplicateBirthdayError) {
      return c.json<ErrorResponse>({ error: error.message }, 400);
    }
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to add date');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, dateId }, 'Failed to update date');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, dateId }, 'Failed to delete date');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to set met info');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to delete met info');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to add social profile');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, profileId }, 'Failed to update social profile');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, profileId }, 'Failed to delete social profile');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId }, 'Failed to add relationship');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, relationshipId }, 'Failed to update relationship');
    Sentry.captureException(err);
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, contactId, relationshipId }, 'Failed to delete relationship');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete relationship' }, 500);
  }
});

export default app;
