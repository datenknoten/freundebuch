import { type } from 'arktype';
import { CollectiveRelationshipRuleResponseSchema } from './collective-relationship-rule-response.js';
import { CollectiveRoleResponseSchema } from './collective-role-response.js';

export const CollectiveTypeResponseSchema = type({
  id: 'string',
  name: 'string',
  description: 'string | null',
  isSystemDefault: 'boolean',
  roles: CollectiveRoleResponseSchema.array(),
  /** Only included in detail responses */
  'rules?': CollectiveRelationshipRuleResponseSchema.array(),
  createdAt: 'string',
  updatedAt: 'string',
});

export type CollectiveTypeResponse = typeof CollectiveTypeResponseSchema.infer;
