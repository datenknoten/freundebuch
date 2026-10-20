import { type } from 'arktype';

/**
 * `sort_order` must be an integer: the column is `integer`, and node-postgres
 * sends parameters as text, so Postgres rejects "1.5" with `invalid input
 * syntax for type integer` - a driver error surfacing as a 500 for what is
 * plainly a bad request.
 */
export const CircleReorderItemSchema = type({
  id: 'string.uuid',
  sort_order: 'number.integer >= 0',
});

export type CircleReorderItem = typeof CircleReorderItemSchema.infer;
