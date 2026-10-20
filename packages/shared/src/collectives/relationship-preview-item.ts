import type { CollectiveMemberContact } from './collective-member-contact.js';
import type { RelationshipTypeSummary } from './relationship-type-summary.js';

/** Preview of a relationship that will be created */
export interface RelationshipPreviewItem {
  fromContact: CollectiveMemberContact;
  toContact: CollectiveMemberContact;
  relationshipType: RelationshipTypeSummary;
  alreadyExists: boolean; // If true, this relationship already exists
}
