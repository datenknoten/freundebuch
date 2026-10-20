import { type } from 'arktype';

export const StreetInfoResponseSchema = type({
  name: 'string',
  /** OSM highway type (residential, primary, …) */
  'type?': 'string',
});

export type StreetInfoResponse = typeof StreetInfoResponseSchema.infer;
