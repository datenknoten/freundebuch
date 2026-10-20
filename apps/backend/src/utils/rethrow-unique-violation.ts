import type { AppError } from '@datenknoten/kit';
import { isPgError } from './is-pg-error.js';

/** Postgres `unique_violation`. */
const UNIQUE_VIOLATION = '23505';

/**
 * Translate a unique-constraint violation into a domain error, or rethrow.
 *
 * Keying on the constraint name rather than just the error code is what makes
 * this safe: a table with two unique constraints previously reported whichever
 * message the catch block happened to hard-code.
 */
export function rethrowUniqueViolation(
  error: unknown,
  byConstraint: Record<string, () => AppError>,
): never {
  if (isPgError(error) && error.code === UNIQUE_VIOLATION && error.constraint !== undefined) {
    const toDomainError = byConstraint[error.constraint];
    if (toDomainError !== undefined) {
      throw toDomainError();
    }
  }
  throw error;
}
