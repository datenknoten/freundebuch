import { type } from 'arktype';

export const FRIEND_SORT_BY_FIELDS = ['display_name', 'created_at', 'updated_at'] as const;

export const FriendSortBySchema = type.enumerated(...FRIEND_SORT_BY_FIELDS);

export type FriendSortBy = typeof FriendSortBySchema.infer;
