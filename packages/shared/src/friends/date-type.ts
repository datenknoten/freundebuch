import { type } from 'arktype';

// Epic 1B: Extended field type enums
export const DateTypeSchema = type('"birthday" | "anniversary" | "other"');

export type DateType = typeof DateTypeSchema.infer;
