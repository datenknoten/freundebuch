import { type } from 'arktype';

export const SORT_ORDERS = ['asc', 'desc'] as const;

export const SortOrderSchema = type.enumerated(...SORT_ORDERS);

export type SortOrder = typeof SortOrderSchema.infer;
