import { ValidationError } from '@datenknoten/kit';
import { parseWith } from '@datenknoten/kit/schema';
import type { Type } from 'arktype';
import { ExternalServiceError } from '../errors/external-service.error.js';

/**
 * Validate the body of a foreign API response. A body that breaks the schema is the
 * upstream's fault, not the caller's, so it throws `ExternalServiceError` (502) with
 * the validation summary as details instead of the 400 `ValidationError`.
 */
export function parseForeignResponse<S extends Type>(service: string, schema: S, body: unknown) {
  try {
    return parseWith(schema, body);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ExternalServiceError(
        service,
        `${service} returned an unexpected response`,
        undefined,
        error.details,
      );
    }
    throw error;
  }
}
