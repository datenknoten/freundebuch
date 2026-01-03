/**
 * Address Lookup Types
 * Types for the hierarchical address input feature
 */

/**
 * Country information from ZipcodeBase
 */
export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2 code (e.g., "DE", "US")
  name: string; // Full country name (e.g., "Germany", "United States")
}

/**
 * City information from ZipcodeBase postal code lookup
 */
export interface CityInfo {
  city: string;
  state?: string;
  stateCode?: string;
}

/**
 * Street information from Overpass API
 */
export interface StreetInfo {
  name: string;
  type?: string; // OSM highway type (residential, primary, etc.)
}

/**
 * House number information from Overpass API
 */
export interface HouseNumberInfo {
  number: string;
  street?: string; // The street this house number is on (for verification)
}
