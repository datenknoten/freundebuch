import type { CircleSummary } from '../circles/circle-summary.js';

/** Contact summary for list views */
export interface FriendListItem {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  // Extended fields for dynamic columns
  nickname?: string;
  maidenName?: string;
  organization?: string;
  jobTitle?: string;
  department?: string;
  primaryCity?: string;
  primaryCountry?: string;
  birthday?: string;
  // Epic 4: Categorization & Organization
  circles: CircleSummary[];
  isFavorite: boolean;
  archivedAt?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
