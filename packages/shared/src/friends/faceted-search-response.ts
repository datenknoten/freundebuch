import { type } from 'arktype';
import { PaginationInfoSchema } from '../pagination/pagination-info.js';
import { FacetGroupsResponseSchema } from './facet-groups-response.js';
import { GlobalSearchResultResponseSchema } from './global-search-result-response.js';

export const FacetedSearchResponseSchema = type({
  data: GlobalSearchResultResponseSchema.array(),
  pagination: PaginationInfoSchema,
  'facets?': FacetGroupsResponseSchema,
});

export type FacetedSearchResponse = typeof FacetedSearchResponseSchema.infer;
