import { type } from 'arktype';
import { PaginationInfoSchema } from '../pagination/pagination-info.js';
import { FriendListItemResponseSchema } from './friend-list-item-response.js';

export const FriendListResponseSchema = type({
  data: FriendListItemResponseSchema.array(),
  pagination: PaginationInfoSchema,
});

export type FriendListResponse = typeof FriendListResponseSchema.infer;
