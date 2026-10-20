import crypto from 'node:crypto';

/**
 * Lookup key stored in `auth.app_passwords.password_prefix`: the first 16 hex
 * characters of sha256 over the first 8 characters of the raw password.
 *
 * The raw prefix is a third of the secret, so storing it in plaintext handed a
 * database dump both a head start and an offline oracle for confirming
 * guesses. Hashing keeps the indexed equality lookup while making the stored
 * value useless on its own. `apps/sabredav` computes the same value with
 * `substr(hash('sha256', $prefix), 0, 16)`.
 */
export function hashAppPasswordPrefix(prefix: string) {
  return crypto.createHash('sha256').update(prefix).digest('hex').slice(0, 16);
}
