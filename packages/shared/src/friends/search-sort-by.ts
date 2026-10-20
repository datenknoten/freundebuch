import { type } from 'arktype';
import type { SortOrder } from '../sorting/sort-order.js';

/** Sort options for search results */
export const SearchSortBySchema = type(
  '"relevance" | "display_name" | "created_at" | "updated_at"',
);

export type SearchSortBy = typeof SearchSortBySchema.infer;

/**
 * Default direction for a search sort: relevance reads best-first, a name
 * reads A-to-Z. Shared by the plain and faceted search parsers.
 */
export function searchSortOrderFor(sortBy: SearchSortBy): SortOrder {
  return sortBy === 'display_name' ? 'asc' : 'desc';
}
