import { type } from 'arktype';
import { RelationshipTypeIdSchema } from './relationship-type-id.js';

// Epic 1D: Relationship input schemas

/** Schema for creating a relationship */
export const RelationshipInputSchema = type({
  related_friend_id: 'string.uuid',
  relationship_type_id: RelationshipTypeIdSchema,
  'notes?': 'string',
});

export type RelationshipInput = typeof RelationshipInputSchema.infer;
