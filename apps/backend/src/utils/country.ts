import { SUPPORTED_COUNTRIES } from '../services/external/zipcodebase.client.js';

/**
 * Map a country name (e.g. "Germany") to its ISO 3166-1 alpha-2 code (e.g. "DE").
 */
export function countryNameToCode(name: string): string | undefined {
  return SUPPORTED_COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase())?.code;
}

/**
 * Extract a country code from the Accept-Language header.
 * E.g. "de-DE,de;q=0.9,en;q=0.8" → "DE"
 */
export function localeToCountry(acceptLanguage: string | undefined): string | undefined {
  if (!acceptLanguage) return undefined;
  const primary = acceptLanguage.split(',')[0]?.trim();
  if (!primary) return undefined;
  // Extract region subtag: "de-DE" → "DE"
  const parts = primary.split('-');
  if (parts.length >= 2) return parts[1].toUpperCase();
  // No region subtag: "de" → "DE" (language code as rough country guess)
  return parts[0].toUpperCase();
}
