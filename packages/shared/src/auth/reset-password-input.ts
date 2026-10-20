import { type } from 'arktype';
import { PasswordSchema } from './password-schema.js';

export const ResetPasswordInputSchema = type({
  token: 'string',
  password: PasswordSchema,
});

export type ResetPasswordInput = typeof ResetPasswordInputSchema.infer;
