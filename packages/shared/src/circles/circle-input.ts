import { type } from 'arktype';

/** Schema for creating/updating a circle */
export const CircleInputSchema = type({
  name: 'string > 0',
  'color?': 'string | null', // hex color code (from palette or custom)
  'parent_circle_id?': 'string | null', // UUID of parent circle for hierarchy
  'sort_order?': 'number.integer >= 0', // integer column; see CircleReorderItemSchema
}).narrow((data, ctx) => {
  // Validate hex color format if provided
  if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
    ctx.mustBe('a circle with a valid hex color (e.g., #3B82F6)');
    return false;
  }
  return true;
});

export type CircleInput = typeof CircleInputSchema.infer;
