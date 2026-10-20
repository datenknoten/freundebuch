import { type } from 'arktype';

export const RelationshipCategorySchema = type('"family" | "professional" | "social"');

export type RelationshipCategory = typeof RelationshipCategorySchema.infer;
