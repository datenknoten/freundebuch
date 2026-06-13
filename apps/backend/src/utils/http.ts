import { type Type, type } from 'arktype';
import type { Context } from 'hono';
import { ValidationError } from './errors.js';
import { isValidUuid } from './security.js';

/**
 * Parse the JSON request body and validate it against an ArkType schema.
 * Collapses the repeated "try json() / instanceof type.errors" boilerplate
 * into one call: throws ValidationError on malformed JSON or schema failure,
 * otherwise returns the validated value.
 */
export async function parseBody<T>(c: Context, schema: Type<T>): Promise<T> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const result = schema(body);
  if (result instanceof type.errors) {
    throw new ValidationError('Invalid request', result);
  }
  return result as T;
}

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
