import { type } from 'arktype';

/** Schema for relationship preview request */
export const RelationshipPreviewInputSchema = type({
  friend_id: 'string.uuid', // External ID of the friend to add
  role_id: 'string.uuid', // External ID of the role
});

export type RelationshipPreviewInput = typeof RelationshipPreviewInputSchema.infer;
