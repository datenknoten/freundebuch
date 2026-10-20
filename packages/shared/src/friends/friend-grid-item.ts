import type { CircleSummaryResponse } from '../circles/circle-summary-response.js';
import type { FriendListItemResponse } from './friend-list-item-response.js';
import type { GlobalSearchResultResponse } from './global-search-result-response.js';

/** Unified grid item that works for both normal listing and search results */
export interface FriendGridItem {
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
  // Categorization
  circles: CircleSummaryResponse[];
  isFavorite?: boolean;
  archivedAt?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  // Search-specific fields (optional, only present for search results)
  rank?: number;
  headline?: string;
  matchSource?: NonNullable<GlobalSearchResultResponse['matchSource']>;
}

/** Convert FriendListItem to FriendGridItem */
export function toFriendGridItem(item: FriendListItemResponse): FriendGridItem {
  return {
    id: item.id,
    displayName: item.displayName,
    photoThumbnailUrl: item.photoThumbnailUrl,
    primaryEmail: item.primaryEmail,
    primaryPhone: item.primaryPhone,
    nickname: item.nickname,
    maidenName: item.maidenName,
    organization: item.organization,
    jobTitle: item.jobTitle,
    department: item.department,
    primaryCity: item.primaryCity,
    primaryCountry: item.primaryCountry,
    birthday: item.birthday,
    circles: item.circles,
    isFavorite: item.isFavorite,
    archivedAt: item.archivedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** Convert GlobalSearchResult to FriendGridItem */
export function searchResultToFriendGridItem(result: GlobalSearchResultResponse): FriendGridItem {
  return {
    id: result.id,
    displayName: result.displayName,
    photoThumbnailUrl: result.photoThumbnailUrl,
    primaryEmail: result.primaryEmail,
    primaryPhone: result.primaryPhone,
    organization: result.organization,
    jobTitle: result.jobTitle,
    circles: result.circles,
    rank: result.rank,
    headline: result.headline ?? undefined,
    matchSource: result.matchSource ?? undefined,
  };
}
