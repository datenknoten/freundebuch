import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';
import { parseSortQuery, type SortOptions, sortQueryFields } from '../sorting/sort-query.js';
import { DEFAULT_FRIEND_PAGE_SIZE } from './default-friend-page-size.js';
import type { FacetFilters } from './facet-filters.js';
import type { RelationshipCategory } from './relationship-category.js';
import { type SearchSortBy, SearchSortBySchema, searchSortOrderFor } from './search-sort-by.js';

/** Schema for faceted search query parameters */
export const FacetedSearchQuerySchema = PaginationQuerySchema.merge(
  sortQueryFields(SearchSortBySchema),
).merge({
  'q?': 'string', // Optional - can search with query OR filter-only
  // Facet filters (comma-separated values)
  'country?': 'string',
  'city?': 'string',
  'organization?': 'string',
  'job_title?': 'string',
  'department?': 'string',
  'relationship_category?': 'string',
  // Epic 4: Categorization & Organization filters
  'circles?': 'string', // Comma-separated circle external_ids
  'favorites?': 'string', // 'true' to filter favorites only
  'archived?': 'string', // 'include', 'exclude' (default), or 'only'
  // Whether to include facet counts in response
  'include_facets?': 'string',
});

export type FacetedSearchQuery = typeof FacetedSearchQuerySchema.infer;

/** Parsed faceted search options */
export interface FacetedSearchOptions extends PaginationOptions, SortOptions<SearchSortBy> {
  query?: string; // Optional - can search with query OR filter-only
  filters: FacetFilters;
  shouldIncludeFacets: boolean;
}

export function parseFacetedSearchQuery(query: FacetedSearchQuery): FacetedSearchOptions {
  // Parse comma-separated filter values
  const parseFilterArray = (value: string | undefined): string[] | undefined => {
    if (!value) return undefined;
    const values = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return values.length > 0 ? values : undefined;
  };

  // Parse archived filter
  const parseArchivedFilter = (value: string | undefined): FacetFilters['archived'] => {
    if (value === 'include' || value === 'exclude' || value === 'only') {
      return value;
    }
    return undefined; // Default to 'exclude' in the backend
  };

  return {
    query: query.q?.trim(), // Optional query
    ...parsePaginationQuery(query, DEFAULT_FRIEND_PAGE_SIZE),
    ...parseSortQuery(query, {
      // Relevance only makes sense when there is a query to be relevant to;
      // a filter-only listing sorts by name.
      sortBy: query.q === undefined || query.q === '' ? 'display_name' : 'relevance',
      sortOrder: searchSortOrderFor,
    }),
    filters: {
      country: parseFilterArray(query.country),
      city: parseFilterArray(query.city),
      organization: parseFilterArray(query.organization),
      job_title: parseFilterArray(query.job_title),
      department: parseFilterArray(query.department),
      relationship_category: parseFilterArray(query.relationship_category) as
        | RelationshipCategory[]
        | undefined,
      // Epic 4: Categorization & Organization filters
      circles: parseFilterArray(query.circles),
      favorites: query.favorites === 'true' ? true : undefined,
      archived: parseArchivedFilter(query.archived),
    },
    shouldIncludeFacets: query.include_facets === 'true',
  };
}
