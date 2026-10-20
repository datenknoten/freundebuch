import type { CountryInfo } from '../address-lookup/country-info.js';
import { countries } from './registered-countries.js';

/** All countries with names in `language`, sorted for that language. */
export function listCountries(language: string): CountryInfo[] {
  const names = countries.getNames(language);
  const source = Object.keys(names).length > 0 ? names : countries.getNames('en');
  const collator = new Intl.Collator(language);
  return Object.entries(source)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => collator.compare(a.name, b.name));
}
