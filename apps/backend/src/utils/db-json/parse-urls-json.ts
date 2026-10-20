import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const UrlJsonRowSchema = type({
  external_id: 'string',
  url: 'string',
  url_type: 'string',
  label: 'string | null',
  created_at: 'string',
});

export type UrlJsonRow = typeof UrlJsonRowSchema.infer;

export function parseUrlsJson(value: unknown, logger: Logger) {
  return safeArray(value, UrlJsonRowSchema, logger, 'urls');
}
