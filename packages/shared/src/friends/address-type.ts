import { type } from 'arktype';

export const AddressTypeSchema = type('"home" | "work" | "other"');

export type AddressType = typeof AddressTypeSchema.infer;
