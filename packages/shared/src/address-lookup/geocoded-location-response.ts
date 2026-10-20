import { type } from 'arktype';

export const GeocodedLocationResponseSchema = type({
  latitude: 'number',
  longitude: 'number',
});

export type GeocodedLocationResponse = typeof GeocodedLocationResponseSchema.infer;
