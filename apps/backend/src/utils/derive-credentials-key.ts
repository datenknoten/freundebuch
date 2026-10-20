import { hkdfSync } from 'node:crypto';

const KEY_BYTES = 32;
const HKDF_SALT = 'freundebuch';
const HKDF_INFO = 'notification-credentials';

/** Derive the credential key from BETTER_AUTH_SECRET; derive once and pass it on. */
export function deriveCredentialsKey(secret: string) {
  return Buffer.from(hkdfSync('sha256', secret, HKDF_SALT, HKDF_INFO, KEY_BYTES));
}
