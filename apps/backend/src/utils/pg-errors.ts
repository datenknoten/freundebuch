import type { AppError } from './errors.js';

/** Postgres `unique_violation`. */
const UNIQUE_VIOLATION = '23505';

/**
 * Narrow a caught value to a Postgres driver error.
 *
 * `pg` rejects with an `Error` carrying `code` and, for constraint failures,
 * `constraint`. Neither is on the `Error` type, so every caller used to
 * hand-roll the same `'code' in error` dance.
 */
export function isPgError(error: unknown): error is Error & { code: string; constraint?: string } {
  return error instanceof Error && 'code' in error && typeof error.code === 'string';
}

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
