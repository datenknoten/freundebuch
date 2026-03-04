import {
  FacetedSearchQuerySchema,
  parseFacetedSearchQuery,
  parseSearchQuery,
  SearchQuerySchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import { FriendsService } from '../../services/friends/index.js';
import type { AppContext } from '../../types/context.js';
import { ValidationError } from '../../utils/errors.js';
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
    throw new ValidationError('Query parameter "q" is required');
  }

  if (exclude && !isValidUuid(exclude)) {
    throw new ValidationError('Invalid exclude parameter');
  }

  const limit = limitParam ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 10)) : 10;

  const friendsService = new FriendsService(db, logger);
  const results = await friendsService.searchFriends(user.userId, query.trim(), exclude, limit);

  return c.json(results);
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
    throw new ValidationError('Query parameter "q" is required');
  }

  // Minimum query length for performance
  if (query.trim().length < 2) {
    throw new ValidationError('Query must be at least 2 characters');
  }

  const limit = limitParam ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 10)) : 10;

  const friendsService = new FriendsService(db, logger);
  const results = await friendsService.fullTextSearch(user.userId, query.trim(), limit);

  return c.json(results);
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

  const queryParams = c.req.query();
  const validated = SearchQuerySchema(queryParams);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  // Minimum query length for performance
  if (validated.q.trim().length < 2) {
    throw new ValidationError('Query must be at least 2 characters');
  }

  const options = parseSearchQuery(validated);
  const friendsService = new FriendsService(db, logger);
  const results = await friendsService.paginatedSearch(user.userId, options);

  return c.json(results);
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

  const queryParams = c.req.query();
  const validated = FacetedSearchQuerySchema(queryParams);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
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
    throw new ValidationError(
      'Either a search query (2+ characters), filters, or includeFacets=true is required',
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

  const friendsService = new FriendsService(db, logger);
  const recentSearches = await friendsService.getRecentSearches(user.userId, limit);

  return c.json(recentSearches);
});

/**
 * POST /api/friends/search/recent
 * Add or update a recent search query
 */
app.post('/recent', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const body = await c.req.json();
  const query = body?.query;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new ValidationError('Query is required');
  }

  if (query.trim().length < 2) {
    throw new ValidationError('Query must be at least 2 characters');
  }

  const friendsService = new FriendsService(db, logger);
  await friendsService.addRecentSearch(user.userId, query.trim());

  return c.json({ success: true }, 201);
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

  const friendsService = new FriendsService(db, logger);
  const deleted = await friendsService.deleteRecentSearch(user.userId, query);

  if (!deleted) {
    return c.json({ error: 'Search query not found' }, 404);
  }

  return c.json({ success: true });
});

/**
 * DELETE /api/friends/search/recent
 * Clear all recent searches
 */
app.delete('/recent', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const friendsService = new FriendsService(db, logger);
  await friendsService.clearRecentSearches(user.userId);

  return c.json({ success: true });
});

export default app;
