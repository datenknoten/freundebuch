import type {
  FacetedSearchOptions,
  FacetedSearchResponse,
  FacetGroups,
  FacetValue,
  GlobalSearchResult,
  PaginatedSearchResponse,
  SearchOptions,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  getCircleFacetCounts,
  type IGetCircleFacetCountsResult,
} from '../../models/queries/friend-circles.queries.js';
import {
  addRecentSearch,
  clearRecentSearches,
  deleteRecentSearch,
  facetedSearch,
  filterOnlyList,
  fullTextSearchFriends,
  getAllFacetCounts,
  getFacetCounts,
  getRecentSearches,
  type IFacetedSearchResult,
  type IFilterOnlyListResult,
  type IFullTextSearchFriendsResult,
  type IGetFacetCountsResult,
  type IPaginatedFullTextSearchResult,
  paginatedFullTextSearch,
} from '../../models/queries/search.queries.js';
import { InvalidSearchParametersError } from '../../utils/errors.js';
import { sanitizeSearchHeadline } from '../../utils/security.js';

/**
 * Escape special characters for PostgreSQL LIKE/ILIKE patterns.
 * Prevents SQL injection by escaping %, _, and \ characters.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Create a wildcard query for ILIKE patterns.
 * Escapes special characters and wraps with % for partial matching.
 */
export function createWildcardQuery(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}

export interface SearchServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * SearchService handles all full-text search functionality for friends.
 * Extracted from FriendsService for better separation of concerns.
 */
export class SearchService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(options: SearchServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Full-text search across friends with relevance ranking
   * Searches: names, organization, job title, work notes, emails, phones,
   * relationship notes, and met context
   */
  async fullTextSearch(
    userExternalId: string,
    query: string,
    limit = 10,
  ): Promise<GlobalSearchResult[]> {
    this.logger.debug({ query, limit }, 'Full-text searching friends');

    const results = await fullTextSearchFriends.run(
      {
        userExternalId,
        query,
        wildcardQuery: createWildcardQuery(query),
        limit,
      },
      this.db,
    );

    return results.map((r) => this.mapGlobalSearchResult(r));
  }

  /**
   * Paginated full-text search with sorting options
   * Used by in-page search for friends list
   */
  async paginatedSearch(
    userExternalId: string,
    options: SearchOptions,
  ): Promise<PaginatedSearchResponse> {
    const { query, page, pageSize, sortBy, sortOrder } = options;
    const offset = (page - 1) * pageSize;

    this.logger.debug({ query, page, pageSize, sortBy, sortOrder }, 'Paginated search');

    const results = await paginatedFullTextSearch.run(
      {
        userExternalId,
        query,
        wildcardQuery: createWildcardQuery(query),
        sortBy,
        sortOrder,
        pageSize,
        offset,
      },
      this.db,
    );

    const total = results[0]?.total_count ?? 0;

    return {
      results: results.map((r) => this.mapPaginatedSearchResult(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Faceted full-text search with filter support and optional facet aggregation
   * Supports filtering by location, professional, and relationship facets
   */
  async facetedSearch(
    userExternalId: string,
    options: FacetedSearchOptions,
  ): Promise<FacetedSearchResponse> {
    const { query, page, pageSize, sortBy, sortOrder, filters, includeFacets } = options;

    // This method requires a query - use filterOnlyList for filter-only searches
    if (!query) {
      throw new InvalidSearchParametersError(
        'facetedSearch requires a query - use filterOnlyList for filter-only searches',
      );
    }

    const offset = (page - 1) * pageSize;
    const wildcardQuery = createWildcardQuery(query);

    this.logger.debug(
      { query, page, pageSize, sortBy, sortOrder, filters, includeFacets },
      'Faceted search',
    );

    // Execute main search with filters
    const results = await facetedSearch.run(
      {
        userExternalId,
        query,
        wildcardQuery,
        sortBy,
        sortOrder,
        pageSize,
        offset,
        filterCountry: filters.country ?? null,
        filterCity: filters.city ?? null,
        filterOrganization: filters.organization ?? null,
        filterJobTitle: filters.job_title ?? null,
        filterDepartment: filters.department ?? null,
        filterRelationshipCategory: filters.relationship_category ?? null,
        filterCircles: filters.circles ?? null,
      },
      this.db,
    );

    const total = results[0]?.total_count ?? 0;

    const response: FacetedSearchResponse = {
      results: results.map((r) => this.mapFacetedSearchResult(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    // Fetch facet counts if requested
    if (includeFacets) {
      const [facetRows, circleRows] = await Promise.all([
        getFacetCounts.run({ userExternalId, query, wildcardQuery }, this.db),
        getCircleFacetCounts.run({ userExternalId }, this.db),
      ]);
      response.facets = this.aggregateFacets(facetRows, circleRows);
    }

    return response;
  }

  /**
   * Filter-only list with optional facet aggregation
   * Used when no search query is provided but filters may be applied
   */
  async filterOnlyList(
    userExternalId: string,
    options: FacetedSearchOptions,
  ): Promise<FacetedSearchResponse> {
    const { page, pageSize, sortBy, sortOrder, filters, includeFacets } = options;
    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { page, pageSize, sortBy, sortOrder, filters, includeFacets },
      'Filter-only list',
    );

    // Execute filter-only query
    const results = await filterOnlyList.run(
      {
        userExternalId,
        sortBy,
        sortOrder,
        pageSize,
        offset,
        filterCountry: filters.country ?? null,
        filterCity: filters.city ?? null,
        filterOrganization: filters.organization ?? null,
        filterJobTitle: filters.job_title ?? null,
        filterDepartment: filters.department ?? null,
        filterRelationshipCategory: filters.relationship_category ?? null,
        filterCircles: filters.circles ?? null,
      },
      this.db,
    );

    const total = results[0]?.total_count ?? 0;

    const response: FacetedSearchResponse = {
      results: results.map((r) => this.mapFilterOnlyResult(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    // Fetch facet counts if requested (uses all friends, not search-filtered)
    if (includeFacets) {
      const [facetRows, circleRows] = await Promise.all([
        getAllFacetCounts.run({ userExternalId }, this.db),
        getCircleFacetCounts.run({ userExternalId }, this.db),
      ]);
      response.facets = this.aggregateFacets(facetRows, circleRows);
    }

    return response;
  }

  /**
   * Get user's recent search queries
   */
  async getRecentSearches(userExternalId: string, limit = 10): Promise<string[]> {
    this.logger.debug({ limit }, 'Getting recent searches');

    const results = await getRecentSearches.run({ userExternalId, limit }, this.db);

    return results.map((r) => r.query);
  }

  /**
   * Add or update a recent search query
   * If the query already exists, updates the searched_at timestamp
   */
  async addRecentSearch(userExternalId: string, query: string): Promise<void> {
    this.logger.debug({ query }, 'Adding recent search');

    await addRecentSearch.run({ userExternalId, query }, this.db);
  }

  /**
   * Delete a specific recent search query
   */
  async deleteRecentSearch(userExternalId: string, query: string): Promise<boolean> {
    this.logger.debug({ query }, 'Deleting recent search');

    const result = await deleteRecentSearch.run({ userExternalId, query }, this.db);

    return result.length > 0;
  }

  /**
   * Clear all recent searches for a user
   */
  async clearRecentSearches(userExternalId: string): Promise<void> {
    this.logger.debug('Clearing all recent searches');

    await clearRecentSearches.run({ userExternalId }, this.db);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mapGlobalSearchResult(row: IFullTextSearchFriendsResult): GlobalSearchResult {
    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      rank: row.rank ?? 0,
      // Sanitize headline to prevent XSS - only allow <mark> tags from ts_headline
      headline: sanitizeSearchHeadline(row.headline),
      matchSource: (row.match_source as GlobalSearchResult['matchSource']) ?? null,
      circles: [], // Circles not included in this query
    };
  }

  private mapPaginatedSearchResult(row: IPaginatedFullTextSearchResult): GlobalSearchResult {
    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      rank: row.rank ?? 0,
      // Sanitize headline to prevent XSS - only allow <mark> tags from ts_headline
      headline: sanitizeSearchHeadline(row.headline),
      matchSource: (row.match_source as GlobalSearchResult['matchSource']) ?? null,
      circles: [], // Circles not included in this query
    };
  }

  private mapFacetedSearchResult(row: IFacetedSearchResult): GlobalSearchResult {
    // Parse circles from JSON
    const circlesRaw = (row.circles || []) as Array<{
      external_id: string;
      name: string;
      color: string | null;
    }>;

    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      rank: row.rank ?? 0,
      // Sanitize headline to prevent XSS - only allow <mark> tags from ts_headline
      headline: sanitizeSearchHeadline(row.headline),
      matchSource: (row.match_source as GlobalSearchResult['matchSource']) ?? null,
      circles: circlesRaw.map((c) => ({
        id: c.external_id,
        name: c.name,
        color: c.color,
      })),
    };
  }

  private mapFilterOnlyResult(row: IFilterOnlyListResult): GlobalSearchResult {
    // Parse circles from JSON
    const circlesRaw = (row.circles || []) as Array<{
      external_id: string;
      name: string;
      color: string | null;
    }>;

    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      rank: 0, // No ranking for filter-only results
      headline: null, // No headline for filter-only results
      matchSource: null, // No match source for filter-only results
      circles: circlesRaw.map((c) => ({
        id: c.external_id,
        name: c.name,
        color: c.color,
      })),
    };
  }

  /**
   * Aggregate raw facet count rows into grouped facet structure
   */
  private aggregateFacets(
    rows: IGetFacetCountsResult[],
    circleRows: IGetCircleFacetCountsResult[] = [],
  ): FacetGroups {
    const facets: FacetGroups = {
      location: [],
      professional: [],
      relationship: [],
      circles: [],
    };

    // Group rows by facet_field
    const groupedByField = new Map<string, FacetValue[]>();

    for (const row of rows) {
      if (!row.facet_field || !row.facet_value || row.count === null) continue;

      const existing = groupedByField.get(row.facet_field);
      if (existing) {
        existing.push({ value: row.facet_value, count: row.count });
      } else {
        groupedByField.set(row.facet_field, [{ value: row.facet_value, count: row.count }]);
      }
    }

    // Map field labels
    const fieldLabels: Record<string, string> = {
      country: 'Country',
      city: 'City',
      organization: 'Organization',
      job_title: 'Job Title',
      department: 'Department',
      relationship_category: 'Relationship',
    };

    // Build location facets
    for (const field of ['country', 'city'] as const) {
      const values = groupedByField.get(field);
      if (values) {
        facets.location.push({ field, label: fieldLabels[field], values });
      }
    }

    // Build professional facets
    for (const field of ['organization', 'job_title', 'department'] as const) {
      const values = groupedByField.get(field);
      if (values) {
        facets.professional.push({ field, label: fieldLabels[field], values });
      }
    }

    // Build relationship facets
    const relationshipValues = groupedByField.get('relationship_category');
    if (relationshipValues) {
      facets.relationship.push({
        field: 'relationship_category',
        label: fieldLabels.relationship_category,
        values: relationshipValues,
      });
    }

    // Build circle facets
    facets.circles = circleRows
      .filter((row) => row.value && row.count !== null)
      .map((row) => ({
        value: row.value,
        label: row.label,
        color: row.color ?? '#6B7280',
        count: row.count ?? 0,
      }));

    return facets;
  }
}
