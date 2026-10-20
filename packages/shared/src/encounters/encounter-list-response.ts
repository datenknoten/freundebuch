import { type } from 'arktype';
import { PaginationInfoSchema } from '../pagination/pagination-info.js';
import { EncounterListItemResponseSchema } from './encounter-list-item-response.js';

export const EncounterListResponseSchema = type({
  data: EncounterListItemResponseSchema.array(),
  pagination: PaginationInfoSchema,
});

export type EncounterListResponse = typeof EncounterListResponseSchema.infer;
