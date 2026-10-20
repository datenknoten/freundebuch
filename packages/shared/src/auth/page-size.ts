import { type } from 'arktype';

export const PageSizeSchema = type('10 | 25 | 50 | 100');

export type PageSize = typeof PageSizeSchema.infer;
