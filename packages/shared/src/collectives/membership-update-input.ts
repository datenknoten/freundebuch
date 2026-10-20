import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';

export const MembershipUpdateInputSchema = type({
  'role_id?': 'string.uuid',
  'joined_date?': IsoDateStringSchema.or('null'),
  'notes?': 'string | null',
});

export type MembershipUpdateInput = typeof MembershipUpdateInputSchema.infer;
