import { ENVELOPE_PREFIX_V1, ENVELOPE_PREFIX_V2 } from './credential-envelope.js';

/** True when the value already carries an encryption envelope. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENVELOPE_PREFIX_V1) || value.startsWith(ENVELOPE_PREFIX_V2);
}
