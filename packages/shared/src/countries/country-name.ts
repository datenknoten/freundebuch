import { countries } from './registered-countries.js';

/** Official country name in `language` ('en' when the language is not registered). */
export function countryName(code: string, language: string): string | undefined {
  return countries.getName(code, language) ?? countries.getName(code, 'en');
}
