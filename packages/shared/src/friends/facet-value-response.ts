import { type } from 'arktype';

export const FacetValueResponseSchema = type({
  value: 'string',
  count: 'number',
});

export type FacetValueResponse = typeof FacetValueResponseSchema.infer;
