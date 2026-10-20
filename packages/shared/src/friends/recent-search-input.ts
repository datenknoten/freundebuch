import { type } from 'arktype';

export const RecentSearchInputSchema = type({
  query: 'string > 0',
});

export type RecentSearchInput = typeof RecentSearchInputSchema.infer;
