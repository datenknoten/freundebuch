import { type } from 'arktype';

const RelationshipDirectionSchema = type("'new_member' | 'existing_member' | 'both'");

export function parseRelationshipDirection(
  value: string,
): 'new_member' | 'existing_member' | 'both' {
  return RelationshipDirectionSchema.assert(value);
}
