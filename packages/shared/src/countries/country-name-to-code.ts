import { isCountryCode } from './country-code.js';
import { countries } from './registered-countries.js';

/** Accepts a code or an English/German name or alias. */
export function countryNameToCode(name: string) {
  const trimmed = name.trim();
  if (trimmed === '') {
    return undefined;
  }
  const upper = trimmed.toUpperCase();
  if (isCountryCode(upper) === true) {
    return upper;
  }
  return countries.getAlpha2Code(trimmed, 'en') ?? countries.getAlpha2Code(trimmed, 'de');
}
