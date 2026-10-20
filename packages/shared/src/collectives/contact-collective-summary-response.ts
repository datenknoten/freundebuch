import { type } from 'arktype';
import { CollectiveRoleResponseSchema } from './collective-role-response.js';

/** A collective the friend belongs to, for the friend detail page */
export const ContactCollectiveSummaryResponseSchema = type({
  id: 'string',
  name: 'string',
  typeName: 'string',
  role: CollectiveRoleResponseSchema,
  membershipId: 'string',
  isActive: 'boolean',
});

export type ContactCollectiveSummaryResponse = typeof ContactCollectiveSummaryResponseSchema.infer;
