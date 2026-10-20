import { type } from 'arktype';
import { PhoneTypeSchema } from './phone-type.js';

export const PhoneResponseSchema = type({
  id: 'string',
  phoneNumber: 'string',
  phoneType: PhoneTypeSchema,
  'label?': 'string',
  isPrimary: 'boolean',
  createdAt: 'string',
});

export type PhoneResponse = typeof PhoneResponseSchema.infer;
