import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';
import { parseSortQuery, type SortOptions, sortQueryFields } from '../sorting/sort-query.js';
import { DEFAULT_FRIEND_PAGE_SIZE } from './default-friend-page-size.js';
import { type SearchSortBy, SearchSortBySchema, searchSortOrderFor } from './search-sort-by.js';

export const SearchQuerySchema = PaginationQuerySchema.merge(
  sortQueryFields(SearchSortBySchema),
).merge({
  q: 'string > 0',
});

export type SearchQuery = typeof SearchQuerySchema.infer;

export interface SearchOptions extends PaginationOptions, SortOptions<SearchSortBy> {
  query: string;
}

export function parseSearchQuery(query: SearchQuery) {
  const options: SearchOptions = {
    query: query.q.trim(),
    ...parsePaginationQuery(query, DEFAULT_FRIEND_PAGE_SIZE),
    ...parseSortQuery(query, { sortBy: 'relevance', sortOrder: searchSortOrderFor }),
  };
  return options;
}
