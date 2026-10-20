import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';
import { parseSortQuery, type SortOptions, sortQueryFields } from '../sorting/sort-query.js';
import { DEFAULT_FRIEND_PAGE_SIZE } from './default-friend-page-size.js';
import { type FriendSortBy, FriendSortBySchema } from './friend-sort-by.js';

/** Schema for friend list query parameters */
export const FriendListQuerySchema = PaginationQuerySchema.merge(
  sortQueryFields(FriendSortBySchema),
).merge({
  // Epic 4: Categorization & Organization filters
  'favorites?': 'string', // 'true' to show only favorites
  'archived?': 'string', // 'true' to include archived, 'only' to show only archived
});

export type FriendListQuery = typeof FriendListQuerySchema.infer;

/** Parsed query options for list endpoint */
export interface FriendListOptions extends PaginationOptions, SortOptions<FriendSortBy> {
  // Epic 4: Categorization & Organization filters
  isFavoritesOnly?: boolean;
  archived?: boolean | 'only'; // true = include, 'only' = only archived, undefined/false = exclude
}

/**
 * Parse and validate friend list query parameters
 */
export function parseFriendListQuery(query: FriendListQuery): FriendListOptions {
  // Epic 4: Parse archived filter
  let archived: boolean | 'only' | undefined;
  if (query.archived === 'true') {
    archived = true;
  } else if (query.archived === 'only') {
    archived = 'only';
  }

  return {
    ...parsePaginationQuery(query, DEFAULT_FRIEND_PAGE_SIZE),
    ...parseSortQuery(query, { sortBy: 'display_name', sortOrder: 'asc' }),
    // Epic 4: Categorization & Organization filters
    isFavoritesOnly: query.favorites === 'true',
    archived,
  };
}
