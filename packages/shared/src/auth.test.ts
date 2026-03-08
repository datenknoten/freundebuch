import { describe, expect, it } from 'vitest';
import { PasswordSchema } from './auth.js';

describe('PasswordSchema', () => {
  it('accepts a valid password with lowercase, uppercase, and digit', () => {
    const result = PasswordSchema('Abcdefg1');
    expect(result).toBe('Abcdefg1');
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = PasswordSchema('Ab1cdef');
    expect(result.summary).toMatchInlineSnapshot(`"must be at least length 8 (was 7)"`);
  });

  it('rejects a password without a lowercase letter', () => {
    const result = PasswordSchema('ABCDEFG1');
    expect(result.summary).toMatchInlineSnapshot(
      `"must be valid according to an anonymous predicate (was "ABCDEFG1")"`,
    );
  });

  it('rejects a password without an uppercase letter', () => {
    const result = PasswordSchema('abcdefg1');
    expect(result.summary).toMatchInlineSnapshot(
      `"must be valid according to an anonymous predicate (was "abcdefg1")"`,
    );
  });

  it('rejects a password without a digit', () => {
    const result = PasswordSchema('Abcdefgh');
    expect(result.summary).toMatchInlineSnapshot(
      `"must be valid according to an anonymous predicate (was "Abcdefgh")"`,
    );
  });

  it('accepts a password with special characters', () => {
    const result = PasswordSchema('Abcde1!@');
    expect(result).toBe('Abcde1!@');
  });
});
