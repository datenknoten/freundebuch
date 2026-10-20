import { type } from 'arktype';
import { CollectiveMemberContactResponseSchema } from './collective-member-contact-response.js';
import { CollectiveRoleResponseSchema } from './collective-role-response.js';

export const CollectiveMemberResponseSchema = type({
  /** Membership external_id */
  id: 'string',
  contact: CollectiveMemberContactResponseSchema,
  role: CollectiveRoleResponseSchema,
  isActive: 'boolean',
  inactiveReason: 'string | null',
  inactiveDate: 'string | null',
  joinedDate: 'string | null',
  notes: 'string | null',
  createdAt: 'string',
  updatedAt: 'string',
});

export type CollectiveMemberResponse = typeof CollectiveMemberResponseSchema.infer;
