import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const DateJsonRowSchema = type({
  external_id: 'string',
  date_value: 'string',
  year_known: 'boolean',
  date_type: 'string',
  label: 'string | null',
  created_at: 'string',
});

export type DateJsonRow = typeof DateJsonRowSchema.infer;

export function parseDatesJson(value: unknown, logger: Logger): DateJsonRow[] {
  return safeArray(value, DateJsonRowSchema, logger, 'dates');
}
