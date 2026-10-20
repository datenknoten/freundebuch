import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const PhoneJsonRowSchema = type({
  external_id: 'string',
  phone_number: 'string',
  phone_type: 'string',
  label: 'string | null',
  is_primary: 'boolean',
  created_at: 'string',
});

export type PhoneJsonRow = typeof PhoneJsonRowSchema.infer;

export function parsePhonesJson(value: unknown, logger: Logger): PhoneJsonRow[] {
  return safeArray(value, PhoneJsonRowSchema, logger, 'phones');
}
