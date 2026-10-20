import { ValidationError } from '@datenknoten/kit';
import { type Type, type } from 'arktype';

/**
 * Validate an already-parsed value against an ArkType schema.
 *
 * Generic over the schema rather than its input type, so schemas that declare
 * defaults work too: `Type<{ x: Default<A, B> }>` validates to a value where
 * `x` is plain `A`, and `infer` is what says so.
 */
export function validate<S extends Type>(schema: S, value: unknown): S['infer'] {
  const result = schema(value);
  if (result instanceof type.errors) {
    throw new ValidationError('Invalid request', result);
  }
  return result as S['infer'];
}
