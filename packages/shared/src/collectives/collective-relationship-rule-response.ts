import { type } from 'arktype';

export const CollectiveRelationshipRuleResponseSchema = type({
  newMemberRoleId: 'string',
  newMemberRoleKey: 'string',
  existingMemberRoleId: 'string',
  existingMemberRoleKey: 'string',
  relationshipTypeId: 'string',
  relationshipDirection: "'new_member' | 'existing_member' | 'both'",
});

export type CollectiveRelationshipRuleResponse =
  typeof CollectiveRelationshipRuleResponseSchema.infer;
