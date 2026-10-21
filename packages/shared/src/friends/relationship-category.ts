import { type } from 'arktype';

export const RELATIONSHIP_CATEGORIES = ['family', 'professional', 'social'] as const;

export const RelationshipCategorySchema = type.enumerated(...RELATIONSHIP_CATEGORIES);

export type RelationshipCategory = typeof RelationshipCategorySchema.infer;
