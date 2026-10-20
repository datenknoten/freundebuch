import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';

/** Schema for creating/updating met information */
export const MetInfoInputSchema = type({
  // `null` clears the date; `''` is not a date and must not reach the `date` column.
  'met_date?': IsoDateStringSchema.or('null'),
  'met_location?': 'string | null',
  'met_context?': 'string | null',
});

export type MetInfoInput = typeof MetInfoInputSchema.infer;
