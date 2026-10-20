/**
 * Street information from Overpass API
 */
export interface StreetInfo {
  name: string;
  type?: string; // OSM highway type (residential, primary, etc.)
}
