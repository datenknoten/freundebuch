import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';
import { DateTypeSchema } from './date-type.js';

// Epic 1B: Extended field input schemas

/**
 * Schema for creating/updating an important date.
 *
 * `date_value` is always a complete YYYY-MM-DD: `friends.friend_dates.date_value` is a
 * NOT NULL `date`, and a birthday whose year nobody knows is stored as a full date with
 * `year_known = false` (the renderer drops the year), not as a partial string.
 */
export const DateInputSchema = type({
  date_value: 'string', // ISO date string YYYY-MM-DD
  'year_known?': 'boolean',
  date_type: DateTypeSchema,
  'label?': 'string',
}).narrow((data, ctx) => {
  if (!IsoDateStringSchema.allows(data.date_value)) {
    ctx.mustBe('an important date with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});

export type DateInput = typeof DateInputSchema.infer;
