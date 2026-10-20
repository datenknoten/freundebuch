import { type } from 'arktype';

const HexColorSchema = type('string')
  .matching(/^#[0-9A-Fa-f]{6}$/)
  .describe('a valid hex color (e.g., #3B82F6)');

export const CircleInputSchema = type({
  name: 'string > 0',
  // `''` passes the check and is stored as is.
  'color?': HexColorSchema.or('"" | null'),
  'parent_circle_id?': 'string | null',
  'sort_order?': 'number.integer >= 0', // integer column; see CircleReorderItemSchema
});

export type CircleInput = typeof CircleInputSchema.infer;
