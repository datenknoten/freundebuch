import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';

/** Schema for updating a membership */
export const MembershipUpdateInputSchema = type({
  'role_id?': 'string.uuid', // External ID of the role
  'joined_date?': 'string | null',
  'notes?': 'string | null',
}).narrow((data, ctx) => {
  // A provided (non-null) date must be YYYY-MM-DD; `''` is not "no date", it is a 400.
  if (typeof data.joined_date === 'string' && !IsoDateStringSchema.allows(data.joined_date)) {
    ctx.mustBe('a membership with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});

export type MembershipUpdateInput = typeof MembershipUpdateInputSchema.infer;
