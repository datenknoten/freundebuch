import { type } from 'arktype';
import { RelationshipCategorySchema } from './relationship-category.js';
import { RelationshipTypeIdSchema } from './relationship-type-id.js';

export const NetworkGraphLinkResponseSchema = type({
  /** Friend id of the link's source node */
  source: 'string',
  /** Friend id of the link's target node */
  target: 'string',
  relationshipType: RelationshipTypeIdSchema,
  relationshipCategory: RelationshipCategorySchema,
  relationshipLabel: 'string',
});

export type NetworkGraphLinkResponse = typeof NetworkGraphLinkResponseSchema.infer;
