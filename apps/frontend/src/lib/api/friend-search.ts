import {
  FacetedSearchResponseSchema,
  type FacetFilters,
  FriendSearchResultResponseSchema,
  GlobalSearchResultResponseSchema,
  type RecentSearchInputSchema,
  RecentSearchListResponseSchema,
  type SearchSortBy,
  SuccessResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';
import { withQuery } from './with-query.js';

export interface FriendSearchApiOptions {
  client: ApiClient;
}

export interface FriendNameSearchParams {
  query: string;
  excludeFriendId?: string;
  limit?: number;
}

/** A query, filters, or both; without either the backend returns only facets. */
export interface FacetedSearchParams {
  query?: string;
  page?: number;
  pageSize?: number;
  sortBy?: SearchSortBy;
  sortOrder?: 'asc' | 'desc';
  filters?: FacetFilters;
  shouldIncludeFacets?: boolean;
}

const FriendSearchResultResponseListSchema = FriendSearchResultResponseSchema.array();
const GlobalSearchResultResponseListSchema = GlobalSearchResultResponseSchema.array();

const FILTER_KEYS = [
  'country',
  'city',
  'organization',
  'job_title',
  'department',
  'relationship_category',
  'circles',
] as const;

function mapFacetedSearchParams(params: FacetedSearchParams) {
  const query: Record<string, string | number | undefined> = {
    q: params.query === '' ? undefined : params.query,
    page: params.page,
    page_size: params.pageSize,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    include_facets: params.shouldIncludeFacets === true ? 'true' : undefined,
  };
  for (const key of FILTER_KEYS) {
    const values = params.filters?.[key];
    query[key] = values === undefined || values.length === 0 ? undefined : values.join(',');
  }
  return query;
}

export class FriendSearchApi {
  private readonly client: ApiClient;

  public constructor(options: FriendSearchApiOptions) {
    this.client = options.client;
  }

  /** Name search for pickers and autocompletes. */
  public searchFriends(params: FriendNameSearchParams) {
    return this.client.request(
      FriendSearchResultResponseListSchema,
      withQuery('/api/friends/search', {
        q: params.query,
        exclude: params.excludeFriendId,
        limit: params.limit,
      }),
    );
  }

  /** Ranked full-text search across names, organisations, contact details and notes. */
  public fullTextSearch(query: string, limit?: number) {
    return this.client.request(
      GlobalSearchResultResponseListSchema,
      withQuery('/api/friends/search/full', { q: query, limit }),
    );
  }

  public facetedSearch(params: FacetedSearchParams) {
    return this.client.request(
      FacetedSearchResponseSchema,
      withQuery('/api/friends/search/faceted', mapFacetedSearchParams(params)),
    );
  }

  public listRecentSearches(limit?: number) {
    return this.client.request(
      RecentSearchListResponseSchema,
      withQuery('/api/friends/search/recent', { limit }),
    );
  }

  /** Adds the query, or moves it to the top when it is already recent. */
  public async addRecentSearch(query: string) {
    await this.client.request(SuccessResponseSchema, '/api/friends/search/recent', {
      method: 'POST',
      body: JSON.stringify({ query } satisfies typeof RecentSearchInputSchema.inferIn),
    });
  }

  public async deleteRecentSearch(query: string) {
    await this.client.request(
      SuccessResponseSchema,
      `/api/friends/search/recent/${encodeURIComponent(query)}`,
      { method: 'DELETE' },
    );
  }

  public async clearRecentSearches() {
    await this.client.request(SuccessResponseSchema, '/api/friends/search/recent', {
      method: 'DELETE',
    });
  }
}
