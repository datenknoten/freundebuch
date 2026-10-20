import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const EmailJsonRowSchema = type({
  external_id: 'string',
  email_address: 'string',
  email_type: 'string',
  label: 'string | null',
  is_primary: 'boolean',
  created_at: 'string',
});

export type EmailJsonRow = typeof EmailJsonRowSchema.infer;

export function parseEmailsJson(value: unknown, logger: Logger) {
  return safeArray(value, EmailJsonRowSchema, logger, 'emails');
}
