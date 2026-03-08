import { describe, expect, it } from 'vitest';
import { normalizePhoneNumber } from './phone-utils.js';

describe('normalizePhoneNumber', () => {
  it('returns number as-is when it already starts with +', () => {
    expect(normalizePhoneNumber('+4915112345678')).toBe('+4915112345678');
  });

  it('returns number as-is when it starts with + even with a default country', () => {
    expect(normalizePhoneNumber('+4915112345678', 'US')).toBe('+4915112345678');
  });

  it('returns original when no default country is provided', () => {
    expect(normalizePhoneNumber('015112345678')).toBe('015112345678');
  });

  it('normalizes a valid national number to E.164 with a country code', () => {
    const result = normalizePhoneNumber('015112345678', 'DE');
    expect(result).toBe('+4915112345678');
  });

  it('returns original when the number is invalid for the given country', () => {
    const result = normalizePhoneNumber('not-a-number', 'DE');
    expect(result).toBe('not-a-number');
  });
});
