import { type } from 'arktype';
import { IsoDateString } from '../dates/iso-date-string.js';

/** Schema for adding a member to a collective */
export const MembershipInputSchema = type({
  friend_id: 'string.uuid', // External ID of the friend
  role_id: 'string.uuid', // External ID of the role
  'joined_date?': 'string | null', // ISO date string (YYYY-MM-DD)
  'notes?': 'string | null',
  'skip_auto_relationships?': 'boolean', // If true, skip auto-relationship creation
}).narrow((data, ctx) => {
  // A provided (non-null) date must be YYYY-MM-DD. Testing the string for truthiness
  // instead let `joined_date: ''` reach Postgres as an invalid date literal.
  if (typeof data.joined_date === 'string' && !IsoDateString.allows(data.joined_date)) {
    ctx.mustBe('a membership with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});

export type MembershipInput = typeof MembershipInputSchema.infer;
