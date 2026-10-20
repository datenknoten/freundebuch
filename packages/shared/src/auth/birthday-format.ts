import { type } from 'arktype';

export const BirthdayFormatSchema = type("'iso' | 'us' | 'eu' | 'long'");

export type BirthdayFormat = typeof BirthdayFormatSchema.infer;
