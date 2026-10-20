import type {
  FacetedSearchOptions,
  FacetedSearchResponse,
  FacetGroupsResponse,
  FacetValueResponse,
  GlobalSearchResultResponse,
  PaginatedSearchResponse,
  SearchOptions,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { InvalidSearchParametersError } from '../../errors/invalid-search-parameters.error.js';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error.js';
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
import { createWildcardQuery } from '../../utils/create-wildcard-query.js';
import { parseCirclesJson } from '../../utils/db-json/parse-circles-json.js';
import { parseMatchSource } from '../../utils/parse-match-source.js';
import { sanitizeSearchHeadline } from '../../utils/sanitize-search-headline.js';

export interface SearchServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

export class SearchService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;

  constructor(options: SearchServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Ranks by relevance across names, organization, job title, work notes,
   * emails, phones, relationship notes and met context.
   */
  public async fullTextSearch(userExternalId: string, query: string, limit = 10) {
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

  /** Backs the in-page search of the friends list. */
  public async paginatedSearch(userExternalId: string, options: SearchOptions) {
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
      data: results.map((r) => this.mapPaginatedSearchResult(r)),
      pagination: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
    } satisfies PaginatedSearchResponse;
  }

  public async facetedSearch(userExternalId: string, options: FacetedSearchOptions) {
    const { query, page, pageSize, sortBy, sortOrder, filters, shouldIncludeFacets } = options;

    if (query === undefined || query === '') {
      throw new InvalidSearchParametersError(
        'facetedSearch requires a query - use filterOnlyList for filter-only searches',
      );
    }

    const offset = (page - 1) * pageSize;
    const wildcardQuery = createWildcardQuery(query);

    this.logger.debug(
      { query, page, pageSize, sortBy, sortOrder, filters, shouldIncludeFacets },
      'Faceted search',
    );

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
      data: results.map((r) => this.mapFacetedSearchResult(r)),
      pagination: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    if (shouldIncludeFacets === true) {
      const [facetRows, circleRows] = await Promise.all([
        getFacetCounts.run({ userExternalId, query, wildcardQuery }, this.db),
        getCircleFacetCounts.run({ userExternalId }, this.db),
      ]);
      response.facets = this.aggregateFacets(facetRows, circleRows);
    }

    return response;
  }

  public async filterOnlyList(userExternalId: string, options: FacetedSearchOptions) {
    const { page, pageSize, sortBy, sortOrder, filters, shouldIncludeFacets } = options;
    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { page, pageSize, sortBy, sortOrder, filters, shouldIncludeFacets },
      'Filter-only list',
    );

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
      data: results.map((r) => this.mapFilterOnlyResult(r)),
      pagination: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    // Facet counts span all friends, not just the filtered ones.
    if (shouldIncludeFacets === true) {
      const [facetRows, circleRows] = await Promise.all([
        getAllFacetCounts.run({ userExternalId }, this.db),
        getCircleFacetCounts.run({ userExternalId }, this.db),
      ]);
      response.facets = this.aggregateFacets(facetRows, circleRows);
    }

    return response;
  }

  public async getRecentSearches(userExternalId: string, limit = 10) {
    this.logger.debug({ limit }, 'Getting recent searches');

    const results = await getRecentSearches.run({ userExternalId, limit }, this.db);

    return results.map((r) => r.query);
  }

  /** An existing query only gets its searched_at timestamp bumped. */
  public async addRecentSearch(userExternalId: string, query: string) {
    this.logger.debug({ query }, 'Adding recent search');

    await addRecentSearch.run({ userExternalId, query }, this.db);
  }

  public async deleteRecentSearch(userExternalId: string, query: string) {
    this.logger.debug({ query }, 'Deleting recent search');

    const result = await deleteRecentSearch.run({ userExternalId, query }, this.db);

    if (result.length === 0) {
      throw new ResourceNotFoundError('Search query', query);
    }
  }

  public async clearRecentSearches(userExternalId: string) {
    this.logger.debug('Clearing all recent searches');

    await clearRecentSearches.run({ userExternalId }, this.db);
  }

  private mapGlobalSearchResult(row: IFullTextSearchFriendsResult) {
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
      matchSource: parseMatchSource(row.match_source ?? null),
      circles: [], // Circles not included in this query
    } satisfies GlobalSearchResultResponse;
  }

  private mapPaginatedSearchResult(row: IPaginatedFullTextSearchResult) {
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
      matchSource: parseMatchSource(row.match_source ?? null),
      circles: [], // Circles not included in this query
    } satisfies GlobalSearchResultResponse;
  }

  private mapFacetedSearchResult(row: IFacetedSearchResult) {
    const circlesRaw = parseCirclesJson(row.circles, this.logger);

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
      matchSource: parseMatchSource(row.match_source ?? null),
      circles: circlesRaw.map((c) => ({
        id: c.external_id,
        name: c.name,
        color: c.color,
      })),
    } satisfies GlobalSearchResultResponse;
  }

  private mapFilterOnlyResult(row: IFilterOnlyListResult) {
    const circlesRaw = parseCirclesJson(row.circles, this.logger);

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
    } satisfies GlobalSearchResultResponse;
  }

  private aggregateFacets(
    rows: IGetFacetCountsResult[],
    circleRows: IGetCircleFacetCountsResult[] = [],
  ) {
    const facets: FacetGroupsResponse = {
      location: [],
      professional: [],
      relationship: [],
      circles: [],
    };

    const groupedByField = new Map<string, FacetValueResponse[]>();

    for (const row of rows) {
      if (
        row.facet_field === null ||
        row.facet_field === '' ||
        row.facet_value === null ||
        row.facet_value === '' ||
        row.count === null
      ) {
        continue;
      }

      const existing = groupedByField.get(row.facet_field);
      if (existing !== undefined) {
        existing.push({ value: row.facet_value, count: row.count });
      } else {
        groupedByField.set(row.facet_field, [{ value: row.facet_value, count: row.count }]);
      }
    }

    const fieldLabels = {
      country: 'Country',
      city: 'City',
      organization: 'Organization',
      job_title: 'Job Title',
      department: 'Department',
      relationship_category: 'Relationship',
    };

    for (const field of ['country', 'city'] as const) {
      const values = groupedByField.get(field);
      if (values !== undefined) {
        facets.location.push({ field, label: fieldLabels[field], values });
      }
    }

    for (const field of ['organization', 'job_title', 'department'] as const) {
      const values = groupedByField.get(field);
      if (values !== undefined) {
        facets.professional.push({ field, label: fieldLabels[field], values });
      }
    }

    const relationshipValues = groupedByField.get('relationship_category');
    if (relationshipValues !== undefined) {
      facets.relationship.push({
        field: 'relationship_category',
        label: fieldLabels.relationship_category,
        values: relationshipValues,
      });
    }

    facets.circles = circleRows
      .filter((row) => row.value !== '' && row.count !== null)
      .map((row) => ({
        value: row.value,
        label: row.label,
        color: row.color ?? '#6B7280',
        count: row.count ?? 0,
      }));

    return facets;
  }
}
