import type { CircleSummary } from '../circles/circle-summary.js';

/** Global search result with relevance ranking and context (Epic 10) */
export interface GlobalSearchResult {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
  organization?: string;
  jobTitle?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  /** Relevance score from full-text search */
  rank: number;
  /** HTML snippet with <mark> tags highlighting matched terms, null for filter-only results */
  headline: string | null;
  /** Where the match was found: friend fields, email, phone, or notes */
  matchSource: 'friend' | 'email' | 'phone' | 'notes' | null;
  /** Circles the friend belongs to */
  circles: CircleSummary[];
}
