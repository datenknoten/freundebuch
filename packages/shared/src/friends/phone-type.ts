import { type } from 'arktype';

export const PhoneTypeSchema = type('"mobile" | "home" | "work" | "fax" | "other"');

export type PhoneType = typeof PhoneTypeSchema.infer;
