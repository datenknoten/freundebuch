import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';

/** Schema for adding a member to a collective */
export const MembershipCreateInputSchema = type({
  friend_id: 'string.uuid', // External ID of the friend
  role_id: 'string.uuid', // External ID of the role
  // `''` is not "no date": it would reach Postgres as an invalid date literal.
  'joined_date?': IsoDateStringSchema.or('null'),
  'notes?': 'string | null',
  'skip_auto_relationships?': 'boolean', // If true, skip auto-relationship creation
});

export type MembershipCreateInput = typeof MembershipCreateInputSchema.infer;
