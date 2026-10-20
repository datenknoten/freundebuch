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
