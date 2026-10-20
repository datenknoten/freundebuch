import { type } from 'arktype';

export const RelationshipTypeIdSchema = type(
  '"spouse" | "parent" | "child" | "sibling" | "grandparent" | "grandchild" | "cousin" | "in_law" | "other_family" | "colleague" | "manager" | "report" | "mentor" | "mentee" | "client" | "other_professional" | "friend" | "neighbor" | "acquaintance" | "other_social"',
);

export type RelationshipTypeId = typeof RelationshipTypeIdSchema.infer;
