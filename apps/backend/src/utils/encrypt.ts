import { createCipheriv, randomBytes } from 'node:crypto';
import { ALGORITHM, ENVELOPE_PREFIX_V2, IV_BYTES } from './credential-envelope.js';

export function encrypt(plain: string, context: string, key: Buffer) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const parts = [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ];
  return `${ENVELOPE_PREFIX_V2}${parts.join(':')}`;
}
