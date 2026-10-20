/**
 * House number information from Overpass API
 */
export interface HouseNumberInfo {
  number: string;
  street?: string; // The street this house number is on (for verification)
}
