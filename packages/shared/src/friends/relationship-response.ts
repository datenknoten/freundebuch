import { type } from 'arktype';
import { RelationshipCategorySchema } from './relationship-category.js';
import { RelationshipTypeIdSchema } from './relationship-type-id.js';

export const RelationshipResponseSchema = type({
  id: 'string',
  relatedFriendId: 'string',
  relatedFriendDisplayName: 'string',
  'relatedFriendPhotoThumbnailUrl?': 'string',
  relationshipTypeId: RelationshipTypeIdSchema,
  relationshipTypeLabel: 'string',
  relationshipCategory: RelationshipCategorySchema,
  'notes?': 'string',
  createdAt: 'string',
});

export type RelationshipResponse = typeof RelationshipResponseSchema.infer;
