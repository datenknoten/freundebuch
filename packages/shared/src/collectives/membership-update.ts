import { type } from 'arktype';
import { IsoDateString } from '../dates/iso-date-string.js';

/** Schema for updating a membership */
export const MembershipUpdateSchema = type({
  'role_id?': 'string.uuid', // External ID of the role
  'joined_date?': 'string | null',
  'notes?': 'string | null',
}).narrow((data, ctx) => {
  // A provided (non-null) date must be YYYY-MM-DD; `''` is not "no date", it is a 400.
  if (typeof data.joined_date === 'string' && !IsoDateString.allows(data.joined_date)) {
    ctx.mustBe('a membership with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});

export type MembershipUpdate = typeof MembershipUpdateSchema.infer;
