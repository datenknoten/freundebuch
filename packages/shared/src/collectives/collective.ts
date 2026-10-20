import type { CollectiveAddress } from './collective-address.js';
import type { CollectiveMember } from './collective-member.js';
import type { CollectiveType } from './collective-type.js';

/** Full collective in API responses */
export interface Collective {
  id: string; // external_id
  name: string;
  type: CollectiveType;
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
  notes: string | null;
  address: CollectiveAddress;
  memberCount: number;
  activeMemberCount: number;
  members: CollectiveMember[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
