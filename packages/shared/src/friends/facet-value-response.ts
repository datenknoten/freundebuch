import { type } from 'arktype';

/** A facet value with the number of matching friends */
export const FacetValueResponseSchema = type({
  value: 'string',
  count: 'number',
});

export type FacetValueResponse = typeof FacetValueResponseSchema.infer;
