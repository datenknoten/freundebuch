import { describe, expect, it } from 'vitest';
import {
  countryDisplayName,
  countryNameToCode,
  isCountryCode,
  listCountries,
} from './countries.js';

describe('countryNameToCode', () => {
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

  it('accepts a value that is already an ISO alpha-2 code', () => {
    expect(countryNameToCode('DE')).toBe('DE');
    expect(countryNameToCode('ch')).toBe('CH');
  });

  it('returns undefined for empty or unknown names', () => {
    expect(countryNameToCode('')).toBeUndefined();
    expect(countryNameToCode('   ')).toBeUndefined();
    expect(countryNameToCode('Atlantis')).toBeUndefined();
  });
});

describe('isCountryCode', () => {
  it('accepts only known upper-case alpha-2 codes', () => {
    expect(isCountryCode('DE')).toBe(true);
    expect(isCountryCode('ZZ')).toBe(false);
    expect(isCountryCode('de')).toBe(false);
    expect(isCountryCode('DEU')).toBe(false);
  });
});

describe('countryDisplayName', () => {
  it('returns the official name in the requested language', () => {
    expect(countryDisplayName('DE', 'de')).toBe('Deutschland');
    expect(countryDisplayName('DE', 'en')).toBe('Germany');
  });

  it('falls back to English for an unregistered language', () => {
    expect(countryDisplayName('DE', 'xx')).toBe('Germany');
  });

  it('returns legacy free text unchanged', () => {
    expect(countryDisplayName('Atlantis', 'de')).toBe('Atlantis');
  });
});

describe('listCountries', () => {
  it('lists countries with localized names in the collation order of the language', () => {
    const countries = listCountries('de');
    expect(countries).toContainEqual({ code: 'AT', name: 'Österreich' });
    const names = countries.map((country) => country.name);
    expect(names.indexOf('Ägypten')).toBeLessThan(names.indexOf('Albanien'));
  });
});
