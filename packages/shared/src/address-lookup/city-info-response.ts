import { type } from 'arktype';

/**
 * City from a postal code lookup (PostGIS / OSM address data).
 * `state`/`stateCode` are optional and currently unpopulated — the geodata
 * source has no state/province column.
 */
export const CityInfoResponseSchema = type({
  city: 'string',
  'state?': 'string',
  'stateCode?': 'string',
});

export type CityInfoResponse = typeof CityInfoResponseSchema.infer;
