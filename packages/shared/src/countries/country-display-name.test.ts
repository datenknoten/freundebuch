import { describe, expect, it } from 'vitest';
import { countryDisplayName } from './country-display-name.js';

describe('countryDisplayName', () => {
  describe('with a country code', () => {
    it('returns the official name in the requested language', () => {
      expect(countryDisplayName('DE', 'de')).toBe('Deutschland');
      expect(countryDisplayName('DE', 'en')).toBe('Germany');
    });

    it('falls back to English for an unregistered language', () => {
      expect(countryDisplayName('DE', 'xx')).toBe('Germany');
    });
  });

  describe('with legacy free text', () => {
    it('returns legacy free text unchanged', () => {
      expect(countryDisplayName('Atlantis', 'de')).toBe('Atlantis');
    });
  });
});
