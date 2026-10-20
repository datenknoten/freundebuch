import { decrypt } from './decrypt.js';

/**
 * Decrypt without throwing, for read paths that only need a display hint and
 * must keep working after a secret rotation (so the user can re-enter the
 * credential through the UI).
 */
export function tryDecrypt(value: string, context: string, key: Buffer): string | null {
  try {
    return decrypt(value, context, key);
  } catch {
    return null;
  }
}
