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

/** Clamps the `limit` query param to 1..max; absent, empty, `0` or non-numeric yields 10. */
function parseLimit(value: string | undefined, max: number) {
  if (value === undefined || value === '') {
    return 10;
  }
  const parsed = Number.parseInt(value, 10);
  return Math.min(max, Math.max(1, Number.isNaN(parsed) === true || parsed === 0 ? 10 : parsed));
}

export function createSearchRoutes(options: SearchRoutesOptions) {
  const app = new Hono<AppContext>();

  // Name search for autocomplete
  app.get('/', async (c) => {
    const user = getAuthUser(c);

    const query = c.req.query('q');
    const exclude = c.req.query('exclude');

    if (query === undefined || query.trim().length === 0) {
      throw new ValidationError('Query parameter "q" is required');
    }

    if (
      exclude !== undefined &&
      exclude !== '' &&
      ExcludeParamSchema(exclude) instanceof type.errors
    ) {
      throw new ValidationError('Invalid exclude parameter');
    }

    const limit = parseLimit(c.req.query('limit'), 50);

    const results = await options.friendsService.searchFriends(
      user.userId,
      query.trim(),
      exclude,
      limit,
    );

    return c.json(results);
  });

  // Relevance-ranked search across names, organization, job title, work notes,
  // emails, phones, relationship notes, and met context
  app.get('/full', async (c) => {
    const user = getAuthUser(c);

    const query = c.req.query('q');

    if (query === undefined || query.trim().length === 0) {
      throw new ValidationError('Query parameter "q" is required');
    }

    // Minimum query length for performance
    if (query.trim().length < 2) {
      throw new ValidationError('Query must be at least 2 characters');
    }

    const limit = parseLimit(c.req.query('limit'), 50);

    const results = await options.friendsService.fullTextSearch(user.userId, query.trim(), limit);

    return c.json(results);
  });

  // Used by the in-page search of the friends list
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

  // Faceted search on location, professional, and relationship facets, with
  // optional facet aggregation; works with a query, filters, or both
  app.get('/faceted', async (c) => {
    const user = getAuthUser(c);

    const queryParams = c.req.query();
    const validated = FacetedSearchQuerySchema(queryParams);

    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    const hasQuery = validated.q !== undefined && validated.q.trim().length >= 2;

    const hasFilters = [
      validated.country,
      validated.city,
      validated.organization,
      validated.job_title,
      validated.department,
      validated.relationship_category,
      validated.circles,
    ].some((value) => value !== undefined && value !== '');

    if (hasQuery === false && hasFilters === false && validated.include_facets !== 'true') {
      throw new ValidationError(
        'Either a search query (2+ characters), filters, or include_facets=true is required',
      );
    }

    const searchOptions = parseFacetedSearchQuery(validated);

    // filterOnlyList handles both filter-only and facets-only requests
    const results =
      hasQuery === true
        ? await options.friendsService.facetedSearch(user.userId, searchOptions)
        : await options.friendsService.filterOnlyList(user.userId, searchOptions);

    return c.json(results);
  });

  app.get('/recent', async (c) => {
    const user = getAuthUser(c);

    const limit = parseLimit(c.req.query('limit'), 20);

    const recentSearches = await options.friendsService.getRecentSearches(user.userId, limit);

    return c.json(recentSearches);
  });

  app.post('/recent', async (c) => {
    const user = getAuthUser(c);

    const { query } = await parseBody(c, RecentSearchInputSchema);

    if (query.trim().length < 2) {
      throw new ValidationError('Query must be at least 2 characters');
    }

    await options.friendsService.addRecentSearch(user.userId, query.trim());

    return c.json({ success: true }, 201);
  });

  app.delete('/recent/:query', async (c) => {
    const user = getAuthUser(c);
    const query = decodeURIComponent(c.req.param('query'));

    await options.friendsService.deleteRecentSearch(user.userId, query);

    return c.json({ success: true });
  });

  app.delete('/recent', async (c) => {
    const user = getAuthUser(c);

    await options.friendsService.clearRecentSearches(user.userId);

    return c.json({ success: true });
  });

  return app;
}
