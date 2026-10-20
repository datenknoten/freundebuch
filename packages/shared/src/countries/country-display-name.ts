import { isCountryCode } from './country-code.js';
import { countryName } from './country-name.js';

/** Display text for a stored country: localized name for a code, legacy free text unchanged. */
export function countryDisplayName(value: string, language: string): string {
  return isCountryCode(value) ? (countryName(value, language) ?? value) : value;
}
