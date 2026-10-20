import { ValidationError } from '@datenknoten/kit';
import type { Context } from 'hono';
import { isValidUuid } from './is-valid-uuid.js';

/** Guards external_id (UUID) routes against a Postgres cast error → 500. */
export function requireUuidParam(c: Context, name: string, label = 'ID') {
  const value = c.req.param(name) ?? '';
  if (isValidUuid(value) === false) {
    throw new ValidationError(`Invalid ${label}`);
  }
  return value;
}
