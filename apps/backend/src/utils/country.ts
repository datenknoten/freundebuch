import { SUPPORTED_COUNTRIES } from './countries.js';

const SUPPORTED_CODES = new Set(SUPPORTED_COUNTRIES.map((c) => c.code));

/**
 * Country names stored in the user's own language (e.g. from CardDAV imports or
 * legacy data) don't match the English {@link SUPPORTED_COUNTRIES} names. Map
 * the common non-English spellings — German first, since that's our primary
 * market — to ISO 3166-1 alpha-2 codes.
 */
const LOCALIZED_COUNTRY_NAMES: Record<string, string> = {
  deutschland: 'DE',
  österreich: 'AT',
  oesterreich: 'AT',
  schweiz: 'CH',
  frankreich: 'FR',
  italien: 'IT',
  spanien: 'ES',
  niederlande: 'NL',
  belgien: 'BE',
  luxemburg: 'LU',
  polen: 'PL',
  tschechien: 'CZ',
  dänemark: 'DK',
  daenemark: 'DK',
  'vereinigtes königreich': 'GB',
  großbritannien: 'GB',
  grossbritannien: 'GB',
  'vereinigte staaten': 'US',
  usa: 'US',
};

/**
 * Languages that map cleanly to a single primary country, used as a fallback
 * when an Accept-Language entry carries no region subtag (e.g. "de" → "DE").
 * Languages spoken across many countries (en, es, pt, ar, …) are intentionally
 * omitted — guessing one would be wrong as often as right.
 */
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  de: 'DE',
  fr: 'FR',
  it: 'IT',
  nl: 'NL',
  pl: 'PL',
  cs: 'CZ',
  da: 'DK',
};

/**
 * Map a country name (e.g. "Germany" or "Deutschland") to its ISO 3166-1
 * alpha-2 code (e.g. "DE"). Also accepts a code that's already in alpha-2 form.
 */
export function countryNameToCode(name: string): string | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;

  // Already an ISO alpha-2 code we recognize.
  const asCode = normalized.toUpperCase();
  if (SUPPORTED_CODES.has(asCode)) return asCode;

  return (
    SUPPORTED_COUNTRIES.find((c) => c.name.toLowerCase() === normalized)?.code ??
    LOCALIZED_COUNTRY_NAMES[normalized]
  );
}

/**
 * Extract a country code from the Accept-Language header.
 * E.g. "de-DE,de;q=0.9,en;q=0.8" → "DE", "en" → undefined (not "EN").
 */
export function localeToCountry(acceptLanguage: string | undefined): string | undefined {
  if (!acceptLanguage) return undefined;

  // Accept-Language is a comma-separated, q-weighted list. Parse it and sort by
  // preference so we honour the user's most-wanted locale first.
  const tags = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim(), weight: Number.isNaN(weight) ? 0 : weight };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => entry.tag);

  // First choice: an explicit region subtag, e.g. "de-DE" → "DE" or
  // "zh-Hant-TW" → "TW". A region subtag is two letters (alpha-2).
  for (const tag of tags) {
    const region = tag
      .split('-')
      .slice(1)
      .find((subtag) => /^[A-Za-z]{2}$/.test(subtag));
    if (region) return region.toUpperCase();
  }

  // Fallback: a language-only tag mapped to its primary country. Never return
  // the language code itself ("en" is not the country "EN").
  for (const tag of tags) {
    const country = LANGUAGE_TO_COUNTRY[tag.split('-')[0].toLowerCase()];
    if (country) return country;
  }

  return undefined;
}
