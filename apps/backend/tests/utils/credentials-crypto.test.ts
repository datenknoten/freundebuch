import { createCipheriv, hkdfSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../src/utils/config.js';
import {
  credentialContext,
  decrypt,
  encrypt,
  encryptOptional,
  isEncrypted,
  resetCredentialsKey,
  tryDecrypt,
} from '../../src/utils/credentials-crypto.js';

const SECRET = 'test-better-auth-secret-test-better-auth-secret-1';
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
  beforeEach(() => {
    resetConfig();
    resetCredentialsKey();
    vi.unstubAllEnvs();
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('BETTER_AUTH_SECRET', SECRET);
  });

  afterEach(() => {
    resetConfig();
    resetCredentialsKey();
    vi.unstubAllEnvs();
  });

  it('round-trips a credential', () => {
    expect(decrypt(encrypt(TOKEN, CONTEXT), CONTEXT)).toBe(TOKEN);
  });

  it('does not leak the plaintext and uses a fresh IV per call', () => {
    const first = encrypt(TOKEN, CONTEXT);
    const second = encrypt(TOKEN, CONTEXT);

    expect(first).not.toContain(TOKEN);
    expect(first).not.toBe(second);
    expect(isEncrypted(first)).toBe(true);
    expect(decrypt(second, CONTEXT)).toBe(TOKEN);
  });

  it('rejects a tampered ciphertext', () => {
    const [prefix, version, iv, tag, ciphertext] = encrypt(TOKEN, CONTEXT).split(':');
    const flipped = ciphertext.startsWith('A')
      ? `B${ciphertext.slice(1)}`
      : `A${ciphertext.slice(1)}`;
    const tampered = [prefix, version, iv, tag, flipped].join(':');

    expect(() => decrypt(tampered, CONTEXT)).toThrow('could not be decrypted');
    expect(tryDecrypt(tampered, CONTEXT)).toBeNull();
  });

  it('rejects a truncated envelope', () => {
    expect(() => decrypt('enc:v1:only-one-part', CONTEXT)).toThrow(
      'Malformed encrypted credential',
    );
  });

  it('passes legacy plaintext through unchanged', () => {
    expect(isEncrypted(TOKEN)).toBe(false);
    expect(decrypt(TOKEN, CONTEXT)).toBe(TOKEN);
  });

  it('encrypts nullable input without double-wrapping', () => {
    expect(encryptOptional(null, CONTEXT)).toBeNull();
    expect(encryptOptional(undefined, CONTEXT)).toBeNull();

    const once = encrypt(TOKEN, CONTEXT);
    expect(encryptOptional(once, CONTEXT)).toBe(once);

    const wrapped = encryptOptional(TOKEN, CONTEXT);
    expect(wrapped).not.toBeNull();
    expect(decrypt(wrapped as string, CONTEXT)).toBe(TOKEN);
  });

  it('cannot decrypt with a different secret', () => {
    const envelope = encrypt(TOKEN, CONTEXT);

    resetConfig();
    resetCredentialsKey();
    vi.stubEnv('BETTER_AUTH_SECRET', 'rotated-better-auth-secret-rotated-secret-value-2');

    expect(() => decrypt(envelope, CONTEXT)).toThrow('could not be decrypted');
  });

  it('cannot decrypt a credential under another user or column', () => {
    const envelope = encrypt(TOKEN, CONTEXT);
    const otherUser = credentialContext(
      '22222222-2222-4222-8222-222222222222',
      'telegram_bot_token',
    );
    const otherColumn = credentialContext(
      '11111111-1111-4111-8111-111111111111',
      'matrix_access_token',
    );

    expect(() => decrypt(envelope, otherUser)).toThrow('could not be decrypted');
    expect(() => decrypt(envelope, otherColumn)).toThrow('could not be decrypted');
  });

  it('reads a v1 envelope and upgrades it to v2 on the next write', () => {
    const legacy = legacyV1Envelope(TOKEN);

    expect(isEncrypted(legacy)).toBe(true);
    // v1 carries no associated data, so any context reads it.
    expect(decrypt(legacy, CONTEXT)).toBe(TOKEN);

    const upgraded = encryptOptional(legacy, CONTEXT);
    expect(upgraded).not.toBeNull();
    expect(upgraded as string).toMatch(/^enc:v2:/);
    expect(decrypt(upgraded as string, CONTEXT)).toBe(TOKEN);
  });
});
