import { type } from 'arktype';
import { RelationshipTypeIdSchema } from './relationship-type-id.js';

export const RelationshipCreateInputSchema = type({
  related_friend_id: 'string.uuid',
  relationship_type_id: RelationshipTypeIdSchema,
  'notes?': 'string',
});

export type RelationshipCreateInput = typeof RelationshipCreateInputSchema.infer;
