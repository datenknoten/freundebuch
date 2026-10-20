import { type } from 'arktype';
import { CircleSummaryResponseSchema } from '../circles/circle-summary-response.js';

export const GlobalSearchResultResponseSchema = type({
  id: 'string',
  displayName: 'string',
  'photoThumbnailUrl?': 'string',
  'organization?': 'string',
  'jobTitle?': 'string',
  'primaryEmail?': 'string',
  'primaryPhone?': 'string',
  /** Full-text search relevance score */
  rank: 'number',
  /** HTML snippet with <mark> tags around matched terms; null for filter-only results */
  headline: 'string | null',
  /** Null for filter-only results */
  matchSource: "'friend' | 'email' | 'phone' | 'notes' | null",
  circles: CircleSummaryResponseSchema.array(),
});

export type GlobalSearchResultResponse = typeof GlobalSearchResultResponseSchema.infer;
