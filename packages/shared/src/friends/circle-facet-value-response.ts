import { type } from 'arktype';

export const CircleFacetValueResponseSchema = type({
  /** Circle external_id */
  value: 'string',
  label: 'string',
  color: 'string',
  count: 'number',
});

export type CircleFacetValueResponse = typeof CircleFacetValueResponseSchema.infer;
