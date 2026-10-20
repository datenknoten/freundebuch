import { type } from 'arktype';
import { RelationshipCategorySchema } from './relationship-category.js';
import { RelationshipTypeIdSchema } from './relationship-type-id.js';

export const RelationshipTypeResponseSchema = type({
  id: RelationshipTypeIdSchema,
  category: RelationshipCategorySchema,
  label: 'string',
  inverseTypeId: RelationshipTypeIdSchema,
});

export type RelationshipTypeResponse = typeof RelationshipTypeResponseSchema.infer;
