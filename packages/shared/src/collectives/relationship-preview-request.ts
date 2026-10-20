import { type } from 'arktype';

/** Schema for relationship preview request */
export const RelationshipPreviewRequestSchema = type({
  friend_id: 'string.uuid', // External ID of the friend to add
  role_id: 'string.uuid', // External ID of the role
});

export type RelationshipPreviewRequest = typeof RelationshipPreviewRequestSchema.infer;
