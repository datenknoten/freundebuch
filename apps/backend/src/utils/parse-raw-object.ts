import { ValidationError } from '@datenknoten/kit';
import type { Context } from 'hono';
import { isRecord } from './is-record.js';

/**
 * Parse the JSON request body as a plain object *without* validating it, for
 * the handful of routes that have to rewrite a field (phone normalisation)
 * before a schema can accept it. Returns a shallow copy, so callers can mutate
 * freely.
 */
export async function parseRawObject(c: Context) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  if (isRecord(body) === false) {
    throw new ValidationError('Invalid JSON');
  }
  return { ...body };
}
