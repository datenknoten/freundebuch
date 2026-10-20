/**
 * Address Lookup Types
 * Types for the hierarchical address input feature
 */

/**
 * Country information (static ISO 3166-1 alpha-2 list)
 */
export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2 code (e.g., "DE", "US")
  name: string; // Country name in the requested UI language
}
