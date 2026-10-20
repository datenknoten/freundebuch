import type { CollectiveMemberContact } from './collective-member-contact.js';
import type { CollectiveRole } from './collective-role.js';
import type { RelationshipPreviewItem } from './relationship-preview-item.js';

/** Response for relationship preview endpoint */
export interface RelationshipPreviewResponse {
  newContact: CollectiveMemberContact;
  role: CollectiveRole;
  relationships: RelationshipPreviewItem[];
  existingRelationshipsSkipped: number; // Count of relationships that already exist
}
