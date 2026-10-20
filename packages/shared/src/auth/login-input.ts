import { type } from 'arktype';
import { EmailSchema } from './email-schema.js';

// Login request schema
export const LoginInputSchema = type({
  email: EmailSchema,
  password: 'string>0',
});

export type LoginInput = typeof LoginInputSchema.infer;
