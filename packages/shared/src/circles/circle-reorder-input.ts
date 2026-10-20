import { type } from 'arktype';
import { CircleReorderItemSchema } from './circle-reorder-item.js';

/** Schema for reordering circles */
export const CircleReorderInputSchema = type({
  order: CircleReorderItemSchema.array(),
});

export type CircleReorderInput = typeof CircleReorderInputSchema.infer;
