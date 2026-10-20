import { type } from 'arktype';
import { PaginationInfoSchema } from '../pagination/pagination-info.js';
import { GlobalSearchResultResponseSchema } from './global-search-result-response.js';

export const PaginatedSearchResponseSchema = type({
  data: GlobalSearchResultResponseSchema.array(),
  pagination: PaginationInfoSchema,
});

export type PaginatedSearchResponse = typeof PaginatedSearchResponseSchema.infer;
