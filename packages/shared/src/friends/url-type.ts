import { type } from 'arktype';

export const UrlTypeSchema = type('"personal" | "work" | "blog" | "other"');

export type UrlType = typeof UrlTypeSchema.infer;
