import { createCipheriv, hkdfSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  credentialContext,
  decrypt,
  deriveCredentialsKey,
  encrypt,
  encryptOptional,
  isEncrypted,
  tryDecrypt,
} from '../../src/utils/credentials-crypto.js';

const SECRET = 'test-better-auth-secret-test-better-auth-secret-1';
const KEY = deriveCredentialsKey(SECRET);
const TOKEN = '1234567890:AAExampleTelegramBotTokenValue';
const CONTEXT = credentialContext('11111111-1111-4111-8111-111111111111', 'telegram_bot_token');

/** A v1 envelope: same key and cipher, no associated data. */
function legacyV1Envelope(plain: string): string {
  const key = Buffer.from(
    hkdfSync('sha256', SECRET, 'freundebuch', 'notification-credentials', 32),
  );
  const iv = Buffer.alloc(12, 7);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `enc:v1:${[
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':')}`;
}

describe('credentials-crypto', () => {
  it('round-trips a credential', () => {
    const envelope = encrypt(TOKEN, CONTEXT, KEY);
    expect(decrypt(envelope, CONTEXT, KEY)).toBe(TOKEN);
  });

  it('does not leak the plaintext and uses a fresh IV per call', () => {
    const first = encrypt(TOKEN, CONTEXT, KEY);
    const second = encrypt(TOKEN, CONTEXT, KEY);

    expect(first).not.toContain(TOKEN);
    expect(first).not.toBe(second);
    expect(isEncrypted(first)).toBe(true);
    expect(decrypt(second, CONTEXT, KEY)).toBe(TOKEN);
  });

  it('rejects a tampered ciphertext', () => {
    const [prefix, version, iv, tag, ciphertext = ''] = encrypt(TOKEN, CONTEXT, KEY).split(':');
    const flipped = ciphertext.startsWith('A')
      ? `B${ciphertext.slice(1)}`
      : `A${ciphertext.slice(1)}`;
    const tampered = [prefix, version, iv, tag, flipped].join(':');

    expect(() => decrypt(tampered, CONTEXT, KEY)).toThrow('could not be decrypted');
    expect(tryDecrypt(tampered, CONTEXT, KEY)).toBeNull();
  });

  it('rejects a truncated envelope', () => {
    expect(() => decrypt('enc:v1:only-one-part', CONTEXT, KEY)).toThrow(
      'Malformed encrypted credential',
    );
  });

  it('passes legacy plaintext through unchanged', () => {
    expect(isEncrypted(TOKEN)).toBe(false);
    expect(decrypt(TOKEN, CONTEXT, KEY)).toBe(TOKEN);
  });

  it('encrypts nullable input without double-wrapping', () => {
    expect(encryptOptional(null, CONTEXT, KEY)).toBeNull();
    expect(encryptOptional(undefined, CONTEXT, KEY)).toBeNull();

    const once = encrypt(TOKEN, CONTEXT, KEY);
    expect(encryptOptional(once, CONTEXT, KEY)).toBe(once);

    const wrapped = encryptOptional(TOKEN, CONTEXT, KEY);
    expect(wrapped).not.toBeNull();
    expect(decrypt(wrapped as string, CONTEXT, KEY)).toBe(TOKEN);
  });

  it('cannot decrypt with a different secret', () => {
    const envelope = encrypt(TOKEN, CONTEXT, KEY);
    const rotatedKey = deriveCredentialsKey('rotated-better-auth-secret-rotated-secret-value-2');

    expect(() => decrypt(envelope, CONTEXT, rotatedKey)).toThrow('could not be decrypted');
  });

  it('cannot decrypt a credential under another user or column', () => {
    const envelope = encrypt(TOKEN, CONTEXT, KEY);
    const otherUser = credentialContext(
      '22222222-2222-4222-8222-222222222222',
      'telegram_bot_token',
    );
    const otherColumn = credentialContext(
      '11111111-1111-4111-8111-111111111111',
      'matrix_access_token',
    );

    expect(() => decrypt(envelope, otherUser, KEY)).toThrow('could not be decrypted');
    expect(() => decrypt(envelope, otherColumn, KEY)).toThrow('could not be decrypted');
  });

  it('reads a v1 envelope and upgrades it to v2 on the next write', () => {
    const legacy = legacyV1Envelope(TOKEN);

    expect(isEncrypted(legacy)).toBe(true);
    // v1 carries no associated data, so any context reads it.
    expect(decrypt(legacy, CONTEXT, KEY)).toBe(TOKEN);

    const upgraded = encryptOptional(legacy, CONTEXT, KEY);
    expect(upgraded).not.toBeNull();
    expect(upgraded as string).toMatch(/^enc:v2:/);
    expect(decrypt(upgraded as string, CONTEXT, KEY)).toBe(TOKEN);
  });
});
