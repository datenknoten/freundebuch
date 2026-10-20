import { type } from 'arktype';

/** Schema for updating a relationship (only notes can be updated) */
export const RelationshipUpdateSchema = type({
  'notes?': 'string | null',
});

export type RelationshipUpdateInput = typeof RelationshipUpdateSchema.infer;
