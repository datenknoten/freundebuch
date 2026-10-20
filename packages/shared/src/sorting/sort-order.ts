import { type } from 'arktype';

export const SortOrderSchema = type('"asc" | "desc"');

export type SortOrder = typeof SortOrderSchema.infer;
