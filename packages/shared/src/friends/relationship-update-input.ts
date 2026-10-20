import { type } from 'arktype';

export const RelationshipUpdateInputSchema = type({
  'notes?': 'string | null',
});

export type RelationshipUpdateInput = typeof RelationshipUpdateInputSchema.infer;
