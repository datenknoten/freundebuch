import { type } from 'arktype';
import { CircleResponseSchema } from './circle-response.js';

export const CircleWithHierarchyResponseSchema = type({
  '...': CircleResponseSchema,
  children: 'this[]',
});

export type CircleWithHierarchyResponse = typeof CircleWithHierarchyResponseSchema.infer;
