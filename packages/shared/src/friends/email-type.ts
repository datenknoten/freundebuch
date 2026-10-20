import { type } from 'arktype';

export const EmailTypeSchema = type('"personal" | "work" | "other"');

export type EmailType = typeof EmailTypeSchema.infer;
