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
