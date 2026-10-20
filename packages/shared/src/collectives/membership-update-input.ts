import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';

/** Schema for updating a membership */
export const MembershipUpdateInputSchema = type({
  'role_id?': 'string.uuid', // External ID of the role
  'joined_date?': IsoDateStringSchema.or('null'),
  'notes?': 'string | null',
});

export type MembershipUpdateInput = typeof MembershipUpdateInputSchema.infer;
