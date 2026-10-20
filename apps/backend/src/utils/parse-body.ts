import { ValidationError } from '@datenknoten/kit';
import type { Type } from 'arktype';
import type { Context } from 'hono';
import { validate } from './validate.js';

/**
 * Parse the JSON request body and validate it against an ArkType schema.
 * Collapses the repeated "try json() / instanceof type.errors" boilerplate
 * into one call: throws ValidationError on malformed JSON or schema failure,
 * otherwise returns the validated value.
 */
export async function parseBody<S extends Type>(c: Context, schema: S): Promise<S['infer']> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  return validate(schema, body);
}
