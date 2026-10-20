import type { CollectiveMemberContact } from './collective-member-contact.js';
import type { CollectiveTypeSummary } from './collective-type-summary.js';

/** Collective in list responses (fewer details) */
export interface CollectiveListItem {
  id: string; // external_id
  name: string;
  type: CollectiveTypeSummary;
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
  memberCount: number;
  activeMemberCount: number;
  memberPreview: CollectiveMemberContact[]; // First few members for preview
  createdAt: string;
  deletedAt: string | null;
}
