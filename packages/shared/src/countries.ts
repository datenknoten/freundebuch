import { type } from 'arktype';
import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json' with { type: 'json' };
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' };
import type { CountryInfo } from './address-lookup.js';

// The browser entry registers no locales; the Node entry registers all. Register ours explicitly.
countries.registerLocale(en);
countries.registerLocale(de);

const ALPHA2 = /^[A-Z]{2}$/;

/** True when `value` is an ISO 3166-1 alpha-2 code known to i18n-iso-countries. */
export function isCountryCode(value: string): boolean {
  return ALPHA2.test(value) && countries.isValid(value);
}

/** ISO 3166-1 alpha-2 country code as stored on addresses (e.g. "DE"). */
export const CountryCodeSchema = type('string').narrow(
  (value, ctx) => isCountryCode(value) || ctx.mustBe('an ISO 3166-1 alpha-2 country code'),
);

/** Official country name in `language` ('en' when the language is not registered). */
export function countryName(code: string, language: string): string | undefined {
  return countries.getName(code, language) ?? countries.getName(code, 'en');
}

/** Display text for a stored country: localized name for a code, legacy free text unchanged. */
export function countryDisplayName(value: string, language: string): string {
  return isCountryCode(value) ? (countryName(value, language) ?? value) : value;
}

/** All countries with names in `language`, sorted for that language. */
export function listCountries(language: string): CountryInfo[] {
  const names = countries.getNames(language);
  const source = Object.keys(names).length > 0 ? names : countries.getNames('en');
  const collator = new Intl.Collator(language);
  return Object.entries(source)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** Map a country code or an English/German name or alias to its alpha-2 code. */
export function countryNameToCode(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return undefined;
  const upper = trimmed.toUpperCase();
  if (isCountryCode(upper)) return upper;
  return countries.getAlpha2Code(trimmed, 'en') ?? countries.getAlpha2Code(trimmed, 'de');
}
