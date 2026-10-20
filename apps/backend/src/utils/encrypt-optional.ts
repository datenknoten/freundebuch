import { ENVELOPE_PREFIX_V2 } from './credential-envelope.js';
import { decrypt } from './decrypt.js';
import { encrypt } from './encrypt.js';

/**
 * Encrypt a nullable credential for a write path. A value that is already a v2
 * envelope is passed through so a re-save never double-wraps; a v1 envelope is
 * re-wrapped so it gains the context binding.
 */
export function encryptOptional(value: string | null | undefined, context: string, key: Buffer) {
  if (value === null || value === undefined) {
    return null;
  }
  if (value.startsWith(ENVELOPE_PREFIX_V2) === true) {
    return value;
  }
  return encrypt(decrypt(value, context, key), context, key);
}
