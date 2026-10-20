import { type } from 'arktype';

/** Postal-code suggestion for prefix autocomplete (PostGIS / OSM address data). */
export const PostalCodeInfoResponseSchema = type({
  postalCode: 'string',
  city: 'string',
});

export type PostalCodeInfoResponse = typeof PostalCodeInfoResponseSchema.infer;
