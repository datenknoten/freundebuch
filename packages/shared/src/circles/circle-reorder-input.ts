import { type } from 'arktype';
import { CircleReorderItemSchema } from './circle-reorder-item.js';

export const CircleReorderInputSchema = type({
  order: CircleReorderItemSchema.array(),
});

export type CircleReorderInput = typeof CircleReorderInputSchema.infer;
