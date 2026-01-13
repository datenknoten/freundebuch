import {
  AddressInputSchema,
  DateInputSchema,
  EmailInputSchema,
  type ErrorResponse,
  FacetedSearchQuerySchema,
  FriendCreateSchema,
  FriendListQuerySchema,
  FriendUpdateSchema,
  MetInfoInputSchema,
  PhoneInputSchema,
  PhotoValidationErrors,
  parseFacetedSearchQuery,
  parseFriendListQuery,
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
import { friendsRateLimitMiddleware } from '../middleware/rate-limit.js';
import { CirclesService } from '../services/circles.service.js';
import { FriendsService } from '../services/friends.service.js';
import { PhotoService, PhotoUploadError } from '../services/photo.service.js';
import type { AppContext } from '../types/context.js';
import { BirthdayAlreadyExistsError, isAppError, toError } from '../utils/errors.js';
import { isValidUuid } from '../utils/security.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all friend routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require self-friend before using friends
app.use('*', onboardingMiddleware);
// Apply rate limiting to all friend routes
app.use('*', friendsRateLimitMiddleware);

// ============================================================================
// Friend CRUD Routes
// ============================================================================

/**
 * GET /api/friends
 * List friends with pagination and sorting
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const queryParams = c.req.query();
    const validated = FriendListQuerySchema(queryParams);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
    }

    const options = parseFriendListQuery(validated);
    const friendsService = new FriendsService(db, logger);
    const result = await friendsService.listFriends(user.userId, options);

    return c.json(result);
  } catch (error) {
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list friends');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to list friends');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list friends' }, 500);
  }
});

/**
 * GET /api/friends/search
 * Search friends by name (for autocomplete)
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
    const friendsService = new FriendsService(db, logger);
    const results = await friendsService.searchFriends(user.userId, query.trim(), exclude, limit);

    return c.json(results);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, query }, 'Failed to search friends');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to search friends' }, 500);
  }
});

// ============================================================================
// Epic 10: Full-Text Search Routes
// ============================================================================

/**
 * GET /api/friends/search/full
 * Full-text search across friends with relevance ranking
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
    const friendsService = new FriendsService(db, logger);
    const results = await friendsService.fullTextSearch(user.userId, query.trim(), limit);

    return c.json(results);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, query }, 'Failed to search friends');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to search friends' }, 500);
  }
});

/**
 * GET /api/friends/search/paginated
 * Paginated full-text search with sorting options
 * Used by in-page search for friends list
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
    const friendsService = new FriendsService(db, logger);
    const results = await friendsService.paginatedSearch(user.userId, options);

    return c.json(results);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to search friends');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to search friends' }, 500);
  }
});

/**
 * GET /api/friends/search/faceted
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
      validated.relationship_category ||
      validated.circles;

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
    const friendsService = new FriendsService(db, logger);

    // Use appropriate method based on whether query is present
    // filterOnlyList handles both filter-only and facets-only requests
    const results = hasQuery
      ? await friendsService.facetedSearch(user.userId, options)
      : await friendsService.filterOnlyList(user.userId, options);

    return c.json(results);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to perform faceted search');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to perform faceted search' }, 500);
  }
});

/**
 * GET /api/friends/search/recent
 * Get user's recent search queries
 */
app.get('/search/recent', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const limitParam = c.req.query('limit');
  const limit = limitParam ? Math.min(20, Math.max(1, Number.parseInt(limitParam, 10) || 10)) : 10;

  try {
    const friendsService = new FriendsService(db, logger);
    const recentSearches = await friendsService.getRecentSearches(user.userId, limit);

    return c.json(recentSearches);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get recent searches');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get recent searches' }, 500);
  }
});

/**
 * POST /api/friends/search/recent
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

    const friendsService = new FriendsService(db, logger);
    await friendsService.addRecentSearch(user.userId, query.trim());

    return c.json({ success: true }, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to add recent search');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add recent search' }, 500);
  }
});

/**
 * DELETE /api/friends/search/recent/:query
 * Delete a specific recent search
 */
app.delete('/search/recent/:query', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const query = decodeURIComponent(c.req.param('query'));

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteRecentSearch(user.userId, query);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Search query not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, query }, 'Failed to delete recent search');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete recent search' }, 500);
  }
});

/**
 * DELETE /api/friends/search/recent
 * Clear all recent searches
 */
app.delete('/search/recent', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const friendsService = new FriendsService(db, logger);
    await friendsService.clearRecentSearches(user.userId);

    return c.json({ success: true });
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to clear recent searches');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to clear recent searches' }, 500);
  }
});

// ============================================================================
// Dashboard Routes
// ============================================================================

/**
 * GET /api/friends/dates/upcoming
 * Get upcoming important dates across all friends
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
    const friendsService = new FriendsService(db, logger);
    const upcomingDates = await friendsService.getUpcomingDates(user.userId, { days, limit });

    return c.json(upcomingDates);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get upcoming dates');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get upcoming dates' }, 500);
  }
});

/**
 * GET /api/friends/relationship-types
 * Get all relationship types grouped by category
 * NOTE: This must be defined before /:id to avoid being caught by the wildcard
 */
app.get('/relationship-types', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const friendsService = new FriendsService(db, logger);
    const types = await friendsService.getRelationshipTypes();

    return c.json(types);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get relationship types');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get relationship types' }, 500);
  }
});

/**
 * GET /api/friends/:id
 * Get a single friend with all related data
 */
app.get('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  try {
    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.getFriendById(user.userId, friendId);

    if (!friend) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(friend);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to get friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get friend' }, 500);
  }
});

/**
 * POST /api/friends
 * Create a new friend
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

    const validated = FriendCreateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.createFriend(user.userId, validated);

    return c.json(friend, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to create friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to create friend' }, 500);
  }
});

/**
 * PUT /api/friends/:id
 * Update an existing friend
 */
app.put('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = FriendUpdateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.updateFriend(user.userId, friendId, validated);

    if (!friend) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(friend);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to update friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update friend' }, 500);
  }
});

/**
 * DELETE /api/friends/:id
 * Soft delete a friend and remove associated photo files
 */
app.delete('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteFriend(user.userId, friendId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    // Delete photo files from disk (best effort - don't fail if photos don't exist)
    try {
      const photoService = new PhotoService(logger);
      await photoService.deletePhoto(friendId);
    } catch (photoError) {
      logger.warn({ error: photoError, friendId }, 'Failed to delete friend photos');
    }

    return c.json({ message: 'Friend deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to delete friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete friend' }, 500);
  }
});

// ============================================================================
// Phone Routes
// ============================================================================

/**
 * POST /api/friends/:id/phones
 * Add a phone number to a friend
 */
app.post('/:id/phones', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
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

    const friendsService = new FriendsService(db, logger);
    const phone = await friendsService.addPhone(user.userId, friendId, validated);

    if (!phone) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(phone, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add phone');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add phone' }, 500);
  }
});

/**
 * PUT /api/friends/:id/phones/:phoneId
 * Update a phone number
 */
app.put('/:id/phones/:phoneId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const phoneId = c.req.param('phoneId');

  if (!isValidUuid(friendId) || !isValidUuid(phoneId)) {
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

    const friendsService = new FriendsService(db, logger);
    const phone = await friendsService.updatePhone(user.userId, friendId, phoneId, validated);

    if (!phone) {
      return c.json<ErrorResponse>({ error: 'Phone not found' }, 404);
    }

    return c.json(phone);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, phoneId }, 'Failed to update phone');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update phone' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/phones/:phoneId
 * Delete a phone number
 */
app.delete('/:id/phones/:phoneId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const phoneId = c.req.param('phoneId');

  if (!isValidUuid(friendId) || !isValidUuid(phoneId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deletePhone(user.userId, friendId, phoneId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Phone not found' }, 404);
    }

    return c.json({ message: 'Phone deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, phoneId }, 'Failed to delete phone');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete phone' }, 500);
  }
});

// ============================================================================
// Email Routes
// ============================================================================

/**
 * POST /api/friends/:id/emails
 * Add an email address to a friend
 */
app.post('/:id/emails', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
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

    const friendsService = new FriendsService(db, logger);
    const email = await friendsService.addEmail(user.userId, friendId, validated);

    if (!email) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(email, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add email');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add email' }, 500);
  }
});

/**
 * PUT /api/friends/:id/emails/:emailId
 * Update an email address
 */
app.put('/:id/emails/:emailId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const emailId = c.req.param('emailId');

  if (!isValidUuid(friendId) || !isValidUuid(emailId)) {
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

    const friendsService = new FriendsService(db, logger);
    const email = await friendsService.updateEmail(user.userId, friendId, emailId, validated);

    if (!email) {
      return c.json<ErrorResponse>({ error: 'Email not found' }, 404);
    }

    return c.json(email);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, emailId }, 'Failed to update email');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update email' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/emails/:emailId
 * Delete an email address
 */
app.delete('/:id/emails/:emailId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const emailId = c.req.param('emailId');

  if (!isValidUuid(friendId) || !isValidUuid(emailId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteEmail(user.userId, friendId, emailId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Email not found' }, 404);
    }

    return c.json({ message: 'Email deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, emailId }, 'Failed to delete email');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete email' }, 500);
  }
});

// ============================================================================
// Address Routes
// ============================================================================

/**
 * POST /api/friends/:id/addresses
 * Add an address to a friend
 */
app.post('/:id/addresses', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
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

    const friendsService = new FriendsService(db, logger);
    const address = await friendsService.addAddress(user.userId, friendId, validated);

    if (!address) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(address, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add address');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add address' }, 500);
  }
});

/**
 * PUT /api/friends/:id/addresses/:addressId
 * Update an address
 */
app.put('/:id/addresses/:addressId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const addressId = c.req.param('addressId');

  if (!isValidUuid(friendId) || !isValidUuid(addressId)) {
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

    const friendsService = new FriendsService(db, logger);
    const address = await friendsService.updateAddress(user.userId, friendId, addressId, validated);

    if (!address) {
      return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
    }

    return c.json(address);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, addressId }, 'Failed to update address');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update address' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/addresses/:addressId
 * Delete an address
 */
app.delete('/:id/addresses/:addressId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const addressId = c.req.param('addressId');

  if (!isValidUuid(friendId) || !isValidUuid(addressId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteAddress(user.userId, friendId, addressId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
    }

    return c.json({ message: 'Address deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, addressId }, 'Failed to delete address');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete address' }, 500);
  }
});

// ============================================================================
// URL Routes
// ============================================================================

/**
 * POST /api/friends/:id/urls
 * Add a URL to a friend
 */
app.post('/:id/urls', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
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

    const friendsService = new FriendsService(db, logger);
    const url = await friendsService.addUrl(user.userId, friendId, validated);

    if (!url) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(url, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add URL');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add URL' }, 500);
  }
});

/**
 * PUT /api/friends/:id/urls/:urlId
 * Update a URL
 */
app.put('/:id/urls/:urlId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const urlId = c.req.param('urlId');

  if (!isValidUuid(friendId) || !isValidUuid(urlId)) {
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

    const friendsService = new FriendsService(db, logger);
    const url = await friendsService.updateUrl(user.userId, friendId, urlId, validated);

    if (!url) {
      return c.json<ErrorResponse>({ error: 'URL not found' }, 404);
    }

    return c.json(url);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, urlId }, 'Failed to update URL');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update URL' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/urls/:urlId
 * Delete a URL
 */
app.delete('/:id/urls/:urlId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const urlId = c.req.param('urlId');

  if (!isValidUuid(friendId) || !isValidUuid(urlId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteUrl(user.userId, friendId, urlId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'URL not found' }, 404);
    }

    return c.json({ message: 'URL deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, urlId }, 'Failed to delete URL');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete URL' }, 500);
  }
});

// ============================================================================
// Photo Routes
// ============================================================================

/**
 * POST /api/friends/:id/photo
 * Upload a profile photo
 */
app.post('/:id/photo', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  // Validate friendId is a valid UUID to prevent path traversal
  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('photo');

    if (!file || !(file instanceof File)) {
      return c.json<ErrorResponse>({ error: PhotoValidationErrors.NO_FILE_PROVIDED }, 400);
    }

    // Verify friend exists and belongs to user
    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.getFriendById(user.userId, friendId);

    if (!friend) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    // Upload photo
    const photoService = new PhotoService(logger);
    const result = await photoService.uploadPhoto(friendId, file);

    // Update friend with photo URLs
    // If DB update fails, clean up the uploaded files to prevent orphaned files
    try {
      await friendsService.updatePhoto(
        user.userId,
        friendId,
        result.photoUrl,
        result.photoThumbnailUrl,
      );
    } catch (dbError) {
      // Clean up uploaded files since DB update failed
      logger.warn({ friendId }, 'DB update failed, cleaning up uploaded photo');
      try {
        await photoService.deletePhoto(friendId);
      } catch (cleanupError) {
        logger.error({ cleanupError, friendId }, 'Failed to clean up photo after DB error');
      }
      throw dbError;
    }

    return c.json(result, 201);
  } catch (error) {
    if (error instanceof PhotoUploadError) {
      return c.json<ErrorResponse>({ error: error.message }, 400);
    }

    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to upload photo');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to upload photo' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/photo
 * Delete a profile photo
 */
app.delete('/:id/photo', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  // Validate friendId is a valid UUID to prevent path traversal
  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.getFriendById(user.userId, friendId);

    if (!friend) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    // Delete photo files
    const photoService = new PhotoService(logger);
    await photoService.deletePhoto(friendId);

    // Clear photo URLs from friend
    await friendsService.updatePhoto(user.userId, friendId, null, null);

    return c.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to delete photo');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete photo' }, 500);
  }
});

// ============================================================================
// Date Routes (Epic 1B)
// ============================================================================

/**
 * POST /api/friends/:id/dates
 * Add an important date to a friend
 */
app.post('/:id/dates', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
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

    const friendsService = new FriendsService(db, logger);
    const date = await friendsService.addDate(user.userId, friendId, validated);

    if (!date) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(date, 201);
  } catch (error) {
    if (error instanceof BirthdayAlreadyExistsError) {
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add date');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add date' }, 500);
  }
});

/**
 * PUT /api/friends/:id/dates/:dateId
 * Update an important date
 */
app.put('/:id/dates/:dateId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const dateId = c.req.param('dateId');

  if (!isValidUuid(friendId) || !isValidUuid(dateId)) {
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

    const friendsService = new FriendsService(db, logger);
    const date = await friendsService.updateDate(user.userId, friendId, dateId, validated);

    if (!date) {
      return c.json<ErrorResponse>({ error: 'Date not found' }, 404);
    }

    return c.json(date);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, dateId }, 'Failed to update date');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update date' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/dates/:dateId
 * Delete an important date
 */
app.delete('/:id/dates/:dateId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const dateId = c.req.param('dateId');

  if (!isValidUuid(friendId) || !isValidUuid(dateId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteDate(user.userId, friendId, dateId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Date not found' }, 404);
    }

    return c.json({ message: 'Date deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, dateId }, 'Failed to delete date');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete date' }, 500);
  }
});

// ============================================================================
// Met Info Routes (Epic 1B)
// ============================================================================

/**
 * PUT /api/friends/:id/met-info
 * Set or update how/where met information (upsert)
 */
app.put('/:id/met-info', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
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

    const friendsService = new FriendsService(db, logger);
    const metInfo = await friendsService.setMetInfo(user.userId, friendId, validated);

    if (!metInfo) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(metInfo);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to set met info');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to set met info' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/met-info
 * Delete how/where met information
 */
app.delete('/:id/met-info', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteMetInfo(user.userId, friendId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Met info not found' }, 404);
    }

    return c.json({ message: 'Met info deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to delete met info');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete met info' }, 500);
  }
});

// ============================================================================
// Social Profile Routes (Epic 1B)
// ============================================================================

/**
 * POST /api/friends/:id/social-profiles
 * Add a social profile to a friend
 */
app.post('/:id/social-profiles', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
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

    const friendsService = new FriendsService(db, logger);
    const profile = await friendsService.addSocialProfile(user.userId, friendId, validated);

    if (!profile) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(profile, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add social profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add social profile' }, 500);
  }
});

/**
 * PUT /api/friends/:id/social-profiles/:profileId
 * Update a social profile
 */
app.put('/:id/social-profiles/:profileId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const profileId = c.req.param('profileId');

  if (!isValidUuid(friendId) || !isValidUuid(profileId)) {
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

    const friendsService = new FriendsService(db, logger);
    const profile = await friendsService.updateSocialProfile(
      user.userId,
      friendId,
      profileId,
      validated,
    );

    if (!profile) {
      return c.json<ErrorResponse>({ error: 'Social profile not found' }, 404);
    }

    return c.json(profile);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, profileId }, 'Failed to update social profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update social profile' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/social-profiles/:profileId
 * Delete a social profile
 */
app.delete('/:id/social-profiles/:profileId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const profileId = c.req.param('profileId');

  if (!isValidUuid(friendId) || !isValidUuid(profileId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteSocialProfile(user.userId, friendId, profileId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Social profile not found' }, 404);
    }

    return c.json({ message: 'Social profile deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, profileId }, 'Failed to delete social profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete social profile' }, 500);
  }
});

// ============================================================================
// Relationship Routes (Epic 1D)
// ============================================================================

/**
 * POST /api/friends/:id/relationships
 * Add a relationship to a friend (creates inverse automatically)
 */
app.post('/:id/relationships', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
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

    // Validate related_friend_id is a valid UUID
    if (!isValidUuid(validated.related_friend_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid related friend ID' }, 400);
    }

    // Prevent self-relationships
    if (validated.related_friend_id === friendId) {
      return c.json<ErrorResponse>({ error: 'Cannot create relationship with self' }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const relationship = await friendsService.addRelationship(user.userId, friendId, validated);

    if (!relationship) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(relationship, 201);
  } catch (error) {
    // Handle unique constraint violation (duplicate relationship)
    if (error instanceof Error && error.message.includes('unique_relationship')) {
      return c.json<ErrorResponse>({ error: 'Relationship already exists' }, 409);
    }
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add relationship');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add relationship' }, 500);
  }
});

/**
 * PUT /api/friends/:id/relationships/:relationshipId
 * Update a relationship's notes
 */
app.put('/:id/relationships/:relationshipId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const relationshipId = c.req.param('relationshipId');

  if (!isValidUuid(friendId) || !isValidUuid(relationshipId)) {
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

    const friendsService = new FriendsService(db, logger);
    const relationship = await friendsService.updateRelationship(
      user.userId,
      friendId,
      relationshipId,
      validated,
    );

    if (!relationship) {
      return c.json<ErrorResponse>({ error: 'Relationship not found' }, 404);
    }

    return c.json(relationship);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, relationshipId }, 'Failed to update relationship');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update relationship' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/relationships/:relationshipId
 * Delete a relationship (and its inverse)
 */
app.delete('/:id/relationships/:relationshipId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const relationshipId = c.req.param('relationshipId');

  if (!isValidUuid(friendId) || !isValidUuid(relationshipId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteRelationship(user.userId, friendId, relationshipId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Relationship not found' }, 404);
    }

    return c.json({ message: 'Relationship deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, relationshipId }, 'Failed to delete relationship');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete relationship' }, 500);
  }
});

// ============================================================================
// Circle Assignment Routes (Epic 4)
// ============================================================================

/**
 * GET /api/friends/:id/circles
 * Get all circles for a friend
 */
app.get('/:id/circles', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const circlesService = new CirclesService(db);
    const circles = await circlesService.getCirclesForFriend(user.userId, friendId);

    return c.json(circles);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to get friend circles');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get friend circles' }, 500);
  }
});

/**
 * PUT /api/friends/:id/circles
 * Set circles for a friend (replaces all existing circle assignments)
 */
const SetCirclesInputSchema = type({
  circle_ids: 'string[]',
});

app.put('/:id/circles', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = SetCirclesInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    // Validate all circle IDs are valid UUIDs
    for (const circleId of validated.circle_ids) {
      if (!isValidUuid(circleId)) {
        return c.json<ErrorResponse>({ error: `Invalid circle ID: ${circleId}` }, 400);
      }
    }

    const circlesService = new CirclesService(db);
    const circles = await circlesService.setFriendCircles(
      user.userId,
      friendId,
      validated.circle_ids,
    );

    return c.json(circles);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to set friend circles');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to set friend circles' }, 500);
  }
});

/**
 * POST /api/friends/:id/circles/:circleId
 * Add friend to a circle
 */
app.post('/:id/circles/:circleId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const circleId = c.req.param('circleId');

  if (!isValidUuid(friendId) || !isValidUuid(circleId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const circlesService = new CirclesService(db);
    const circle = await circlesService.addFriendToCircle(user.userId, friendId, circleId);

    if (!circle) {
      return c.json<ErrorResponse>({ error: 'Friend or circle not found' }, 404);
    }

    return c.json(circle, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, circleId }, 'Failed to add friend to circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add friend to circle' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/circles/:circleId
 * Remove friend from a circle
 */
app.delete('/:id/circles/:circleId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const circleId = c.req.param('circleId');

  if (!isValidUuid(friendId) || !isValidUuid(circleId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const circlesService = new CirclesService(db);
    const removed = await circlesService.removeFriendFromCircle(user.userId, friendId, circleId);

    if (!removed) {
      return c.json<ErrorResponse>({ error: 'Friend-circle assignment not found' }, 404);
    }

    return c.json({ message: 'Friend removed from circle successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, circleId }, 'Failed to remove friend from circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to remove friend from circle' }, 500);
  }
});

// ============================================================================
// Favorites & Archive Routes (Epic 4)
// ============================================================================

/**
 * POST /api/friends/:id/favorite
 * Toggle the favorite status of a friend
 */
app.post('/:id/favorite', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const isFavorite = await friendsService.toggleFavorite(user.userId, friendId);

    if (isFavorite === null) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json({ is_favorite: isFavorite });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to toggle favorite');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to toggle favorite' }, 500);
  }
});

/**
 * POST /api/friends/:id/archive
 * Archive a friend
 */
const ArchiveInputSchema = type({
  'reason?': 'string',
});

app.post('/:id/archive', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    let body: unknown = {};
    try {
      const text = await c.req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = ArchiveInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const archived = await friendsService.archiveFriend(user.userId, friendId, validated.reason);

    if (!archived) {
      return c.json<ErrorResponse>({ error: 'Friend not found or already archived' }, 404);
    }

    return c.json({ message: 'Friend archived successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to archive friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to archive friend' }, 500);
  }
});

/**
 * POST /api/friends/:id/unarchive
 * Unarchive a friend (restore from archive)
 */
app.post('/:id/unarchive', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const unarchived = await friendsService.unarchiveFriend(user.userId, friendId);

    if (!unarchived) {
      return c.json<ErrorResponse>({ error: 'Friend not found or not archived' }, 404);
    }

    return c.json({ message: 'Friend unarchived successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to unarchive friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to unarchive friend' }, 500);
  }
});

export default app;
