import type { RelationshipCategory } from './relationship-category.js';
import type { RelationshipTypeId } from './relationship-type-id.js';

/** Relationship in API responses */
export interface Relationship {
  id: string;
  relatedFriendId: string;
  relatedFriendDisplayName: string;
  relatedFriendPhotoThumbnailUrl?: string;
  relationshipTypeId: RelationshipTypeId;
  relationshipTypeLabel: string;
  relationshipCategory: RelationshipCategory;
  notes?: string;
  createdAt: string;
}
