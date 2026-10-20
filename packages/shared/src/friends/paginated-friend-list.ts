import type { Paginated } from '../pagination/paginated.js';
import type { FriendListItem } from './friend-list-item.js';

/** Paginated friend list response */
export type PaginatedFriendList = Paginated<FriendListItem>;
