import type { CollectiveRelationshipRule } from './collective-relationship-rule.js';
import type { CollectiveRole } from './collective-role.js';

/** Collective type in API responses */
export interface CollectiveType {
  id: string; // external_id
  name: string;
  description: string | null;
  isSystemDefault: boolean;
  roles: CollectiveRole[];
  rules?: CollectiveRelationshipRule[]; // Only included in detail responses
  createdAt: string;
  updatedAt: string;
}
