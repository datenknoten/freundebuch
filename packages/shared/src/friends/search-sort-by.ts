import { type } from 'arktype';

export const SearchSortBySchema = type(
  '"relevance" | "display_name" | "created_at" | "updated_at"',
);

export type SearchSortBy = typeof SearchSortBySchema.infer;

/**
 * Default direction for a search sort: relevance reads best-first, a name
 * reads A-to-Z. Shared by the plain and faceted search parsers.
 */
export function searchSortOrderFor(sortBy: SearchSortBy) {
  return sortBy === 'display_name' ? 'asc' : 'desc';
}
