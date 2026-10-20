import { type } from 'arktype';

/** Schema for updating a relationship (only notes can be updated) */
export const RelationshipUpdateInputSchema = type({
  'notes?': 'string | null',
});

export type RelationshipUpdateInput = typeof RelationshipUpdateInputSchema.infer;
