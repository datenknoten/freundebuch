import { type } from 'arktype';

/** Schema for the recent-search body (POST /api/friends/search/recent) */
export const RecentSearchInputSchema = type({
  query: 'string > 0',
});

export type RecentSearchInput = typeof RecentSearchInputSchema.infer;
