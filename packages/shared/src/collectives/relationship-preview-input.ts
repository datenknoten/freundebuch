import { type } from 'arktype';

export const RelationshipPreviewInputSchema = type({
  friend_id: 'string.uuid',
  role_id: 'string.uuid',
});

export type RelationshipPreviewInput = typeof RelationshipPreviewInputSchema.infer;
