/**
 * Address Lookup Types
 * Types for the hierarchical address input feature
 */

/**
 * Country information (static ISO 3166-1 alpha-2 list)
 */
export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2 code (e.g., "DE", "US")
  name: string; // Full country name (e.g., "Germany", "United States")
}

/**
 * City information from a postal code lookup (PostGIS / OSM address data).
 * `state`/`stateCode` are optional and currently unpopulated — the geodata
 * source has no state/province column.
 */
export interface CityInfo {
  city: string;
  state?: string;
  stateCode?: string;
}

/**
 * Postal-code suggestion for prefix autocomplete (PostGIS / OSM address data).
 */
export interface PostalCodeInfo {
  postalCode: string;
  city: string;
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

/**
 * Geocoded location coordinates
 */
export interface GeocodedLocation {
  latitude: number;
  longitude: number;
}
