import { isCountryCode } from './country-code.js';
import { countries } from './registered-countries.js';

/** Map a country code or an English/German name or alias to its alpha-2 code. */
export function countryNameToCode(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return undefined;
  const upper = trimmed.toUpperCase();
  if (isCountryCode(upper)) return upper;
  return countries.getAlpha2Code(trimmed, 'en') ?? countries.getAlpha2Code(trimmed, 'de');
}
