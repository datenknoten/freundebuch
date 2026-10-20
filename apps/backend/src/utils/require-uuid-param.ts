import { ValidationError } from '@datenknoten/kit';
import type { Context } from 'hono';
import { isValidUuid } from './is-valid-uuid.js';

/**
 * Read a path param and assert it is a UUID, throwing ValidationError if not.
 * Guards external_id (UUID) routes against a Postgres cast error → 500.
 */
export function requireUuidParam(c: Context, name: string, label = 'ID'): string {
  const value = c.req.param(name) ?? '';
  if (!isValidUuid(value)) {
    throw new ValidationError(`Invalid ${label}`);
  }
  return value;
}
