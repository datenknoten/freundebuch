import type { RelationshipType } from './relationship-type.js';

/** Relationship types grouped by category */
export interface RelationshipTypesGrouped {
  family: RelationshipType[];
  professional: RelationshipType[];
  social: RelationshipType[];
}
