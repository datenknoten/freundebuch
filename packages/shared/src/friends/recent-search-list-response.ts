import { type } from 'arktype';

export const RecentSearchListResponseSchema = type('string[]');

export type RecentSearchListResponse = typeof RecentSearchListResponseSchema.infer;
