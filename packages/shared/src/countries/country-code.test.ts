import { describe, expect, it } from 'vitest';
import { isCountryCode } from './country-code.js';

describe('isCountryCode', () => {
  it('accepts only known upper-case alpha-2 codes', () => {
    expect(isCountryCode('DE')).toBe(true);
    expect(isCountryCode('ZZ')).toBe(false);
    expect(isCountryCode('de')).toBe(false);
    expect(isCountryCode('DEU')).toBe(false);
  });
});
