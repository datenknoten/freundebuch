import { type } from 'arktype';
import { CollectiveMemberContactResponseSchema } from './collective-member-contact-response.js';
import { CollectiveRoleResponseSchema } from './collective-role-response.js';
import { RelationshipPreviewItemResponseSchema } from './relationship-preview-item-response.js';

export const RelationshipPreviewResponseSchema = type({
  newContact: CollectiveMemberContactResponseSchema,
  role: CollectiveRoleResponseSchema,
  relationships: RelationshipPreviewItemResponseSchema.array(),
  /** Number of relationships that already exist and are not created again */
  existingRelationshipsSkipped: 'number',
});

export type RelationshipPreviewResponse = typeof RelationshipPreviewResponseSchema.infer;
