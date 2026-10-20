import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';

/** Schema for creating/updating met information */
export const MetInfoInputSchema = type({
  'met_date?': 'string | null', // ISO date string or null
  'met_location?': 'string | null',
  'met_context?': 'string | null',
}).narrow((data, ctx) => {
  // `null` clears the date; `''` is not a date and must not reach the `date` column.
  if (typeof data.met_date === 'string' && !IsoDateStringSchema.allows(data.met_date)) {
    ctx.mustBe('met information with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});

export type MetInfoInput = typeof MetInfoInputSchema.infer;
