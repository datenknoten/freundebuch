import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';

/** Schema for deactivating a membership */
export const MembershipDeactivateInputSchema = type({
  'reason?': 'string | null',
  'inactive_date?': IsoDateStringSchema.or('null'),
});

export type MembershipDeactivateInput = typeof MembershipDeactivateInputSchema.infer;
