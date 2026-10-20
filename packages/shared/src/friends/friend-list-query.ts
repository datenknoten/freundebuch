import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';
import { parseSortQuery, type SortOptions, sortQueryFields } from '../sorting/sort-query.js';
import { DEFAULT_FRIEND_PAGE_SIZE } from './default-friend-page-size.js';
import { type FriendSortBy, FriendSortBySchema } from './friend-sort-by.js';

export const FriendListQuerySchema = PaginationQuerySchema.merge(
  sortQueryFields(FriendSortBySchema),
).merge({
  // 'true' keeps favorites only.
  'favorites?': 'string',
  // 'true' includes archived friends, 'only' keeps archived friends only.
  'archived?': 'string',
});

export type FriendListQuery = typeof FriendListQuerySchema.infer;

export interface FriendListOptions extends PaginationOptions, SortOptions<FriendSortBy> {
  isFavoritesOnly?: boolean;
  // true includes archived, 'only' keeps archived only, undefined/false excludes them.
  archived?: boolean | 'only';
}

function parseArchived(value: string | undefined) {
  if (value === 'true') {
    return true;
  }
  if (value === 'only') {
    return 'only';
  }
  return undefined;
}

export function parseFriendListQuery(query: FriendListQuery) {
  const options: FriendListOptions = {
    ...parsePaginationQuery(query, DEFAULT_FRIEND_PAGE_SIZE),
    ...parseSortQuery(query, { sortBy: 'display_name', sortOrder: 'asc' }),
    isFavoritesOnly: query.favorites === 'true',
    archived: parseArchived(query.archived),
  };
  return options;
}
