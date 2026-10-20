/** Relationship rule for a collective type */
export interface CollectiveRelationshipRule {
  newMemberRoleId: string;
  newMemberRoleKey: string;
  existingMemberRoleId: string;
  existingMemberRoleKey: string;
  relationshipTypeId: string;
  relationshipDirection: 'new_member' | 'existing_member' | 'both';
}
