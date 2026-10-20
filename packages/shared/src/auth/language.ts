import { type } from 'arktype';

export const LanguageSchema = type("'en' | 'de'");

export type Language = typeof LanguageSchema.infer;
