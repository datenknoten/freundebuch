import { type } from 'arktype';
import { IsoDateString } from '../dates/iso-date-string.js';

/** Schema for deactivating a membership */
export const MembershipDeactivateSchema = type({
  'reason?': 'string | null',
  'inactive_date?': 'string | null', // ISO date string (YYYY-MM-DD)
}).narrow((data, ctx) => {
  // A provided (non-null) date must be YYYY-MM-DD; `''` is not "no date", it is a 400.
  if (typeof data.inactive_date === 'string' && !IsoDateString.allows(data.inactive_date)) {
    ctx.mustBe('a deactivation with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});

export type MembershipDeactivate = typeof MembershipDeactivateSchema.infer;
