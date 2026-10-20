import { type } from 'arktype';

const HexColorSchema = type('string')
  .matching(/^#[0-9A-Fa-f]{6}$/)
  .describe('a valid hex color (e.g., #3B82F6)');

/** Schema for creating/updating a circle */
export const CircleInputSchema = type({
  name: 'string > 0',
  // `''` passes the check and is stored as is.
  'color?': HexColorSchema.or('"" | null'), // hex color code (from palette or custom)
  'parent_circle_id?': 'string | null', // UUID of parent circle for hierarchy
  'sort_order?': 'number.integer >= 0', // integer column; see CircleReorderItemSchema
});

export type CircleInput = typeof CircleInputSchema.infer;
