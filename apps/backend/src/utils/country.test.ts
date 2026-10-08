import { describe, expect, it } from 'vitest';
import { localeToCountry } from './country.js';

describe('localeToCountry', () => {
  it('returns undefined when the header is missing or empty', () => {
    expect(localeToCountry(undefined)).toBeUndefined();
    expect(localeToCountry('')).toBeUndefined();
  });

  it('extracts the region subtag from the most-preferred locale', () => {
    expect(localeToCountry('de-DE,de;q=0.9,en;q=0.8')).toBe('DE');
    expect(localeToCountry('en-US')).toBe('US');
  });

  it('honours q-weights rather than list order', () => {
    expect(localeToCountry('en;q=0.5,de-DE;q=0.9')).toBe('DE');
  });

  it('skips script subtags to find the region', () => {
    expect(localeToCountry('zh-Hant-TW')).toBe('TW');
  });

  it('does not turn a language-only tag into a bogus country code', () => {
    // The old bug returned "EN" here.
    expect(localeToCountry('en')).toBeUndefined();
  });

  it('maps unambiguous language-only tags to their primary country', () => {
    expect(localeToCountry('de')).toBe('DE');
    expect(localeToCountry('fr')).toBe('FR');
  });

  it('falls back to a language guess when no entry has a region', () => {
    expect(localeToCountry('en,de;q=0.9')).toBe('DE');
  });
});
