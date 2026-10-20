import { describe, expect, it } from 'vitest';
import { countryNameToCode } from './country-name-to-code.js';

describe('countryNameToCode', () => {
  describe('with a known country name', () => {
    it('maps English country names and aliases to codes', () => {
      expect(countryNameToCode('Germany')).toBe('DE');
      expect(countryNameToCode('United States')).toBe('US');
      expect(countryNameToCode('USA')).toBe('US');
    });

    it('is case- and whitespace-insensitive', () => {
      expect(countryNameToCode('  germany ')).toBe('DE');
      expect(countryNameToCode('GERMANY')).toBe('DE');
    });

    it('maps German country names to codes', () => {
      expect(countryNameToCode('Deutschland')).toBe('DE');
      expect(countryNameToCode('Österreich')).toBe('AT');
      expect(countryNameToCode('Schweiz')).toBe('CH');
      expect(countryNameToCode('Großbritannien')).toBe('GB');
    });
  });

  describe('with an ISO alpha-2 code', () => {
    it('accepts a value that is already an ISO alpha-2 code', () => {
      expect(countryNameToCode('DE')).toBe('DE');
      expect(countryNameToCode('ch')).toBe('CH');
    });
  });

  describe('with an empty or unknown name', () => {
    it('returns undefined for empty or unknown names', () => {
      expect(countryNameToCode('')).toBeUndefined();
      expect(countryNameToCode('   ')).toBeUndefined();
      expect(countryNameToCode('Atlantis')).toBeUndefined();
    });
  });
});
