import { type } from 'arktype';

// Epic 1D: Relationship type enums
export const RelationshipCategorySchema = type('"family" | "professional" | "social"');

export type RelationshipCategory = typeof RelationshipCategorySchema.infer;
