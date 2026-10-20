import { type } from 'arktype';
import { CollectiveTypeResponseSchema } from './collective-type-response.js';

export const CollectiveTypeListResponseSchema = type({
  types: CollectiveTypeResponseSchema.array(),
});

export type CollectiveTypeListResponse = typeof CollectiveTypeListResponseSchema.infer;
