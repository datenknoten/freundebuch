import {
  type ErrorResponse,
  FacetedSearchQuerySchema,
  parseFacetedSearchQuery,
  parseSearchQuery,
  SearchQuerySchema,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import { FriendsService } from '../../services/friends/index.js';
import type { AppContext } from '../../types/context.js';
import { toError } from '../../utils/errors.js';
import { isValidUuid } from '../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * GET /api/friends/search
 * Search friends by name (for autocomplete)
 */
app.get('/', async (c) => {
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

/**
 * GET /api/friends/search/full
 * Full-text search across friends with relevance ranking
 * Searches: names, organization, job title, work notes, emails, phones,
 * relationship notes, and met context
 */
app.get('/full', async (c) => {
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
app.get('/paginated', async (c) => {
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
app.get('/faceted', async (c) => {
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
app.get('/recent', async (c) => {
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
app.post('/recent', async (c) => {
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
app.delete('/recent/:query', async (c) => {
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
app.delete('/recent', async (c) => {
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

export default app;
