import type { AppError } from '@datenknoten/kit';
import { isPgError } from './is-pg-error.js';

/** Postgres `unique_violation`. */
const UNIQUE_VIOLATION = '23505';

/**
 * Maps a unique-constraint violation to its domain error; any other error is
 * returned unchanged, so callers always `throw` the result.
 *
 * Keying on the constraint name rather than just the error code is what makes
 * this safe: a table with two unique constraints previously reported whichever
 * message the catch block happened to hard-code.
 */
export function toUniqueViolationError(
  error: unknown,
  byConstraint: Record<string, () => AppError>,
) {
  if (
    isPgError(error) === true &&
    error.code === UNIQUE_VIOLATION &&
    error.constraint !== undefined
  ) {
    const toDomainError = byConstraint[error.constraint];
    if (toDomainError !== undefined) {
      return toDomainError();
    }
  }
  return error;
}
