import { describe, expect, it } from 'vitest';
import { normalizePhoneNumber } from './normalize-phone-number.js';

describe('normalizePhoneNumber', () => {
  describe('when the number already starts with +', () => {
    it('returns the number unchanged', () => {
      expect(normalizePhoneNumber('+4915112345678')).toBe('+4915112345678');
    });

    it('returns the number unchanged even with a default country', () => {
      expect(normalizePhoneNumber('+4915112345678', 'US')).toBe('+4915112345678');
    });
  });

  describe('with a national number', () => {
    it('returns the original when no default country is provided', () => {
      expect(normalizePhoneNumber('015112345678')).toBe('015112345678');
    });

    it('normalizes a valid number to E.164 with the default country', () => {
      const result = normalizePhoneNumber('015112345678', 'DE');
      expect(result).toBe('+4915112345678');
    });

    it('returns the original when the number is invalid for the given country', () => {
      const result = normalizePhoneNumber('not-a-number', 'DE');
      expect(result).toBe('not-a-number');
    });
  });
});
