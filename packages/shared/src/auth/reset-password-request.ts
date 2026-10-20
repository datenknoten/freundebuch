import { type } from 'arktype';
import { PasswordSchema } from './password-schema.js';

// Reset password request schema
export const ResetPasswordRequestSchema = type({
  token: 'string',
  password: PasswordSchema,
});

export type ResetPasswordRequest = typeof ResetPasswordRequestSchema.infer;
