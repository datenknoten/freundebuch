import { ValidationError } from '@datenknoten/kit';
import {
  FacetedSearchQuerySchema,
  parseFacetedSearchQuery,
  parseSearchQuery,
  RecentSearchInputSchema,
  SearchQuerySchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import type { FriendsService } from '../../services/friends/friends.service.js';
import type { AppContext } from '../../types/context.js';
import { parseBody } from '../../utils/parse-body.js';

/** The `exclude` query parameter must be a friend external_id (UUID). */
const ExcludeParamSchema = type('string.uuid');

export interface SearchRoutesOptions {
  friendsService: FriendsService;
}

export function createSearchRoutes(options: SearchRoutesOptions): Hono<AppContext> {
  const app = new Hono<AppContext>();

  /**
   * GET /api/friends/search
   * Search friends by name (for autocomplete)
   */
  app.get('/', async (c) => {
    const user = getAuthUser(c);

    const query = c.req.query('q');
    const exclude = c.req.query('exclude');
    const limitParam = c.req.query('limit');

    if (!query || query.trim().length === 0) {
      throw new ValidationError('Query parameter "q" is required');
    }

    if (exclude && ExcludeParamSchema(exclude) instanceof type.errors) {
      throw new ValidationError('Invalid exclude parameter');
    }

    const limit = limitParam
      ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 10))
      : 10;

    const results = await options.friendsService.searchFriends(
      user.userId,
      query.trim(),
      exclude,
      limit,
    );

    return c.json(results);
  });

  /**
   * GET /api/friends/search/full
   * Full-text search across friends with relevance ranking
   * Searches: names, organization, job title, work notes, emails, phones,
   * relationship notes, and met context
   */
  app.get('/full', async (c) => {
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

    const limit = limitParam
      ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 10))
      : 10;

    const results = await options.friendsService.fullTextSearch(user.userId, query.trim(), limit);

    return c.json(results);
  });

  /**
   * GET /api/friends/search/paginated
   * Paginated full-text search with sorting options
   * Used by in-page search for friends list
   */
  app.get('/paginated', async (c) => {
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

    const searchOptions = parseSearchQuery(validated);
    const results = await options.friendsService.paginatedSearch(user.userId, searchOptions);

    return c.json(results);
  });

  /**
   * GET /api/friends/search/faceted
   * Faceted full-text search with filter support and optional facet aggregation
   * Supports filtering by location, professional, and relationship facets
   * Can be used with a search query, filters, or both
   */
  app.get('/faceted', async (c) => {
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

    // Require at least a query, filters, or include_facets
    if (!hasQuery && !hasFilters && validated.include_facets !== 'true') {
      throw new ValidationError(
        'Either a search query (2+ characters), filters, or include_facets=true is required',
      );
    }

    const searchOptions = parseFacetedSearchQuery(validated);

    // Use appropriate method based on whether query is present
    // filterOnlyList handles both filter-only and facets-only requests
    const results = hasQuery
      ? await options.friendsService.facetedSearch(user.userId, searchOptions)
      : await options.friendsService.filterOnlyList(user.userId, searchOptions);

    return c.json(results);
  });

  /**
   * GET /api/friends/search/recent
   * Get user's recent search queries
   */
  app.get('/recent', async (c) => {
    const user = getAuthUser(c);

    const limitParam = c.req.query('limit');
    const limit = limitParam
      ? Math.min(20, Math.max(1, Number.parseInt(limitParam, 10) || 10))
      : 10;

    const recentSearches = await options.friendsService.getRecentSearches(user.userId, limit);

    return c.json(recentSearches);
  });

  /**
   * POST /api/friends/search/recent
   * Add or update a recent search query
   */
  app.post('/recent', async (c) => {
    const user = getAuthUser(c);

    const { query } = await parseBody(c, RecentSearchInputSchema);

    if (query.trim().length < 2) {
      throw new ValidationError('Query must be at least 2 characters');
    }

    await options.friendsService.addRecentSearch(user.userId, query.trim());

    return c.json({ success: true }, 201);
  });

  /**
   * DELETE /api/friends/search/recent/:query
   * Delete a specific recent search
   */
  app.delete('/recent/:query', async (c) => {
    const user = getAuthUser(c);
    const query = decodeURIComponent(c.req.param('query'));

    await options.friendsService.deleteRecentSearch(user.userId, query);

    return c.json({ success: true });
  });

  /**
   * DELETE /api/friends/search/recent
   * Clear all recent searches
   */
  app.delete('/recent', async (c) => {
    const user = getAuthUser(c);

    await options.friendsService.clearRecentSearches(user.userId);

    return c.json({ success: true });
  });

  return app;
}
