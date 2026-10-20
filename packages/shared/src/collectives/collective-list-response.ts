import { type } from 'arktype';
import { PaginationInfoSchema } from '../pagination/pagination-info.js';
import { CollectiveListItemResponseSchema } from './collective-list-item-response.js';

export const CollectiveListResponseSchema = type({
  data: CollectiveListItemResponseSchema.array(),
  pagination: PaginationInfoSchema,
});

export type CollectiveListResponse = typeof CollectiveListResponseSchema.infer;
