import { isValue, ValidationError } from '@datenknoten/kit';
import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';
import { parseSortQuery, type SortOptions, sortQueryFields } from '../sorting/sort-query.js';
import { DEFAULT_FRIEND_PAGE_SIZE } from './default-friend-page-size.js';
import type { FacetFilters } from './facet-filters.js';
import { type RelationshipCategory, RelationshipCategorySchema } from './relationship-category.js';
import { type SearchSortBy, SearchSortBySchema, searchSortOrderFor } from './search-sort-by.js';

export const FacetedSearchQuerySchema = PaginationQuerySchema.merge(
  sortQueryFields(SearchSortBySchema),
).merge({
  // Optional: a client may search by query, by filters only, or both.
  'q?': 'string',
  // Facet filters are comma-separated values.
  'country?': 'string',
  'city?': 'string',
  'organization?': 'string',
  'job_title?': 'string',
  'department?': 'string',
  'relationship_category?': 'string',
  // Circle external_ids.
  'circles?': 'string',
  // 'true' keeps favorites only.
  'favorites?': 'string',
  // 'include', 'exclude' (the backend default) or 'only'.
  'archived?': 'string',
  'include_facets?': 'string',
});

export type FacetedSearchQuery = typeof FacetedSearchQuerySchema.infer;

export interface FacetedSearchOptions extends PaginationOptions, SortOptions<SearchSortBy> {
  query?: string;
  filters: FacetFilters;
  shouldIncludeFacets: boolean;
}

function isRelationshipCategory(value: string): value is RelationshipCategory {
  return RelationshipCategorySchema.allows(value);
}

function parseRelationshipCategories(values: string[] | undefined) {
  if (values === undefined) {
    return undefined;
  }
  const invalid = values.filter((value) => isRelationshipCategory(value) === false);
  if (invalid.length > 0) {
    throw new ValidationError(`Invalid relationship_category: ${invalid.join(', ')}`, {
      relationship_category: invalid,
    });
  }
  return values.filter(isRelationshipCategory);
}

function nonEmptyOrUndefined(value: string) {
  return value === '' ? undefined : value;
}

function parseFilterArray(value: string | undefined) {
  if (value === undefined || value === '') {
    return undefined;
  }
  const values = value
    .split(',')
    .map((v) => nonEmptyOrUndefined(v.trim()))
    .filter(isValue);
  return values.length > 0 ? values : undefined;
}

function parseArchivedFilter(value: string | undefined) {
  if (value === 'include' || value === 'exclude' || value === 'only') {
    return value;
  }
  return undefined;
}

export function parseFacetedSearchQuery(query: FacetedSearchQuery) {
  const options: FacetedSearchOptions = {
    query: query.q?.trim(),
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
      relationship_category: parseRelationshipCategories(
        parseFilterArray(query.relationship_category),
      ),
      circles: parseFilterArray(query.circles),
      favorites: query.favorites === 'true' ? true : undefined,
      archived: parseArchivedFilter(query.archived),
    },
    shouldIncludeFacets: query.include_facets === 'true',
  };
  return options;
}
