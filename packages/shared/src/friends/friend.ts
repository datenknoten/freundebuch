import type { CircleSummary } from '../circles/circle-summary.js';
import type { Address } from './address.js';
import type { Email } from './email.js';
import type { FriendDate } from './friend-date.js';
import type { MetInfo } from './met-info.js';
import type { Phone } from './phone.js';
import type { ProfessionalHistory } from './professional-history.js';
import type { Relationship } from './relationship.js';
import type { SocialProfile } from './social-profile.js';
import type { Url } from './url.js';

/** Full friend with all sub-resources */
export interface Friend {
  id: string;
  displayName: string;
  nickname?: string;
  namePrefix?: string;
  nameFirst?: string;
  nameMiddle?: string;
  nameLast?: string;
  nameSuffix?: string;
  maidenName?: string;
  photoUrl?: string;
  photoThumbnailUrl?: string;
  // Epic 1A sub-resources
  phones: Phone[];
  emails: Email[];
  addresses: Address[];
  urls: Url[];
  // Professional history (employment records with date ranges)
  professionalHistory: ProfessionalHistory[];
  // Personal interests (not employment-related)
  interests?: string;
  // Epic 1B: Extended sub-resources (optional for backwards compatibility)
  dates?: FriendDate[];
  metInfo?: MetInfo;
  socialProfiles?: SocialProfile[];
  // Epic 1D: Relationships
  relationships?: Relationship[];
  // Epic 4: Categorization & Organization
  circles: CircleSummary[];
  isFavorite: boolean;
  archivedAt?: string;
  archiveReason?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
