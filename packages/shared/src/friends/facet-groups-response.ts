import { type } from 'arktype';
import { CircleFacetValueResponseSchema } from './circle-facet-value-response.js';
import { FacetGroupResponseSchema } from './facet-group-response.js';

export const FacetGroupsResponseSchema = type({
  location: FacetGroupResponseSchema.array(),
  professional: FacetGroupResponseSchema.array(),
  relationship: FacetGroupResponseSchema.array(),
  circles: CircleFacetValueResponseSchema.array(),
});

export type FacetGroupsResponse = typeof FacetGroupsResponseSchema.infer;
