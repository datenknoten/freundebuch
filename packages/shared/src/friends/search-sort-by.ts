import { type } from 'arktype';

export const SEARCH_SORT_BY_FIELDS = [
  'relevance',
  'display_name',
  'created_at',
  'updated_at',
] as const;

export const SearchSortBySchema = type.enumerated(...SEARCH_SORT_BY_FIELDS);

export type SearchSortBy = typeof SearchSortBySchema.infer;

/**
 * Default direction for a search sort: relevance reads best-first, a name
 * reads A-to-Z. Shared by the plain and faceted search parsers.
 */
export function searchSortOrderFor(sortBy: SearchSortBy) {
  return sortBy === 'display_name' ? 'asc' : 'desc';
}
