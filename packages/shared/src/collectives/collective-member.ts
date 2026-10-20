import type { CollectiveMemberContact } from './collective-member-contact.js';
import type { CollectiveRole } from './collective-role.js';

/** Member of a collective */
export interface CollectiveMember {
  id: string; // membership external_id
  contact: CollectiveMemberContact;
  role: CollectiveRole;
  isActive: boolean;
  inactiveReason: string | null;
  inactiveDate: string | null;
  joinedDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
