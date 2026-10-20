import { type } from 'arktype';

/** Fields a friend list can be sorted by. */
export const FriendSortBySchema = type('"display_name" | "created_at" | "updated_at"');

export type FriendSortBy = typeof FriendSortBySchema.infer;
