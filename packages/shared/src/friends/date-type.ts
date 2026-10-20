import { type } from 'arktype';

export const DateTypeSchema = type('"birthday" | "anniversary" | "other"');

export type DateType = typeof DateTypeSchema.infer;
