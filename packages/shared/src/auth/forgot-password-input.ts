import { type } from 'arktype';
import { EmailSchema } from './email-schema.js';

export const ForgotPasswordInputSchema = type({
  email: EmailSchema,
});

export type ForgotPasswordInput = typeof ForgotPasswordInputSchema.infer;
