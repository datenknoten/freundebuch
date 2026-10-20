import { type } from 'arktype';
import { EmailSchema } from './email-schema.js';

export const LoginInputSchema = type({
  email: EmailSchema,
  password: 'string>0',
});

export type LoginInput = typeof LoginInputSchema.infer;
