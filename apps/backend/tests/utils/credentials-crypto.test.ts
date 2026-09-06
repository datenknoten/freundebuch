import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../../src/utils/config.js';
import {
  decrypt,
  encrypt,
  encryptOptional,
  isEncrypted,
  resetCredentialsKey,
  tryDecrypt,
} from '../../src/utils/credentials-crypto.js';

const SECRET = 'test-better-auth-secret-test-better-auth-secret-1';
const TOKEN = '1234567890:AAExampleTelegramBotTokenValue';

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
    expect(decrypt(encrypt(TOKEN))).toBe(TOKEN);
  });

  it('does not leak the plaintext and uses a fresh IV per call', () => {
    const first = encrypt(TOKEN);
    const second = encrypt(TOKEN);

    expect(first).not.toContain(TOKEN);
    expect(first).not.toBe(second);
    expect(isEncrypted(first)).toBe(true);
    expect(decrypt(second)).toBe(TOKEN);
  });

  it('rejects a tampered ciphertext', () => {
    const [prefix, version, iv, tag, ciphertext] = encrypt(TOKEN).split(':');
    const flipped = ciphertext.startsWith('A')
      ? `B${ciphertext.slice(1)}`
      : `A${ciphertext.slice(1)}`;
    const tampered = [prefix, version, iv, tag, flipped].join(':');

    expect(() => decrypt(tampered)).toThrow('could not be decrypted');
    expect(tryDecrypt(tampered)).toBeNull();
  });

  it('rejects a truncated envelope', () => {
    expect(() => decrypt('enc:v1:only-one-part')).toThrow('Malformed encrypted credential');
  });

  it('passes legacy plaintext through unchanged', () => {
    expect(isEncrypted(TOKEN)).toBe(false);
    expect(decrypt(TOKEN)).toBe(TOKEN);
  });

  it('encrypts nullable input without double-wrapping', () => {
    expect(encryptOptional(null)).toBeNull();
    expect(encryptOptional(undefined)).toBeNull();

    const once = encrypt(TOKEN);
    expect(encryptOptional(once)).toBe(once);

    const wrapped = encryptOptional(TOKEN);
    expect(wrapped).not.toBeNull();
    expect(decrypt(wrapped as string)).toBe(TOKEN);
  });

  it('cannot decrypt with a different secret', () => {
    const envelope = encrypt(TOKEN);

    resetConfig();
    resetCredentialsKey();
    vi.stubEnv('BETTER_AUTH_SECRET', 'rotated-better-auth-secret-rotated-secret-value-2');

    expect(() => decrypt(envelope)).toThrow('could not be decrypted');
  });
});
