import type { RelationshipCategory } from './relationship-category.js';
import type { RelationshipTypeId } from './relationship-type-id.js';

// Epic 1D: Relationship response interfaces

/** Relationship type definition */
export interface RelationshipType {
  id: RelationshipTypeId;
  category: RelationshipCategory;
  label: string;
  inverseTypeId: RelationshipTypeId;
}
