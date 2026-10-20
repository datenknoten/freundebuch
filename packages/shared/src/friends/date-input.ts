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
  date_value: IsoDateStringSchema,
  year_known: 'boolean = true',
  date_type: DateTypeSchema,
  'label?': 'string',
});

export type DateInput = typeof DateInputSchema.infer;
