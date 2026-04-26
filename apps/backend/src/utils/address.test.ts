import { describe, expect, it } from 'vitest';
import { parseStreetLine } from './address.js';

describe('parseStreetLine', () => {
  it('returns empty object when input is undefined', () => {
    expect(parseStreetLine(undefined)).toEqual({});
  });

  it('returns empty object when input is empty or whitespace', () => {
    expect(parseStreetLine('')).toEqual({});
    expect(parseStreetLine('   ')).toEqual({});
  });

  it('parses DACH-style "street number" format', () => {
    expect(parseStreetLine('Hauptstraße 10')).toEqual({
      street: 'Hauptstraße',
      houseNumber: '10',
    });
  });

  it('parses DACH-style with alphanumeric house numbers', () => {
    expect(parseStreetLine('Hauptstraße 10a')).toEqual({
      street: 'Hauptstraße',
      houseNumber: '10a',
    });
    expect(parseStreetLine('Bahnhofstrasse 5/3')).toEqual({
      street: 'Bahnhofstrasse',
      houseNumber: '5/3',
    });
  });

  it('parses multi-word street with trailing number', () => {
    expect(parseStreetLine('Straße des 17. Juni 135')).toEqual({
      street: 'Straße des 17. Juni',
      houseNumber: '135',
    });
  });

  it('parses US-style "number street" format', () => {
    expect(parseStreetLine('10 Main Street')).toEqual({
      street: 'Main Street',
      houseNumber: '10',
    });
  });

  it('parses US-style with alphanumeric leading number', () => {
    expect(parseStreetLine('221B Baker Street')).toEqual({
      street: 'Baker Street',
      houseNumber: '221B',
    });
  });

  it('falls back to street-only when no number present', () => {
    expect(parseStreetLine('Some Street')).toEqual({
      street: 'Some Street',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(parseStreetLine('  Hauptstraße 10  ')).toEqual({
      street: 'Hauptstraße',
      houseNumber: '10',
    });
  });
});
