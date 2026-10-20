import { createDecipheriv } from 'node:crypto';
import { CredentialDecryptError } from '../errors/credential-decrypt.error.js';
import { ALGORITHM, ENVELOPE_PREFIX_V1, ENVELOPE_PREFIX_V2 } from './credential-envelope.js';

/**
 * Decrypt an envelope. Values without the envelope are returned unchanged:
 * rows written before encryption existed are plaintext and stay readable
 * until the startup backfill (or the next write) converts them.
 *
 * Throws when the envelope is present but cannot be authenticated — a wrong
 * key, a tampered value, or a v2 ciphertext presented under the wrong context
 * must not silently degrade to garbage.
 */
export function decrypt(value: string, context: string, key: Buffer): string {
  const isV2 = value.startsWith(ENVELOPE_PREFIX_V2);
  if (!isV2 && !value.startsWith(ENVELOPE_PREFIX_V1)) {
    return value;
  }

  const parts = value.slice(ENVELOPE_PREFIX_V2.length).split(':');
  const [iv, authTag, ciphertext] = parts;
  if (parts.length !== 3 || iv === undefined || authTag === undefined || ciphertext === undefined) {
    throw new CredentialDecryptError('Malformed encrypted credential envelope');
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64url'));
    // v1 was written without associated data; setting it there would fail the
    // tag check on every legacy row.
    if (isV2) {
      decipher.setAAD(Buffer.from(context, 'utf8'));
    }
    decipher.setAuthTag(Buffer.from(authTag, 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  } catch {
    throw new CredentialDecryptError(
      'Stored credential could not be decrypted; re-enter the channel credentials',
    );
  }
}
