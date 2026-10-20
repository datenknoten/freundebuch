import { type } from 'arktype';

export const FriendSortBySchema = type('"display_name" | "created_at" | "updated_at"');

export type FriendSortBy = typeof FriendSortBySchema.infer;
