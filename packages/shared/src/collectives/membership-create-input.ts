import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';

export const MembershipCreateInputSchema = type({
  friend_id: 'string.uuid',
  role_id: 'string.uuid',
  // `''` is not "no date": it would reach Postgres as an invalid date literal.
  'joined_date?': IsoDateStringSchema.or('null'),
  'notes?': 'string | null',
  'skip_auto_relationships?': 'boolean',
});

export type MembershipCreateInput = typeof MembershipCreateInputSchema.infer;
