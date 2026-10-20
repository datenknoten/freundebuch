import { type } from 'arktype';
import { ArrayFacetFieldSchema } from './array-facet-field.js';
import { FacetValueResponseSchema } from './facet-value-response.js';

export const FacetGroupResponseSchema = type({
  field: ArrayFacetFieldSchema,
  label: 'string',
  values: FacetValueResponseSchema.array(),
});

export type FacetGroupResponse = typeof FacetGroupResponseSchema.infer;
