import { type } from 'arktype';
import { emailType } from './email-type.js';
import { PasswordSchema } from './password-schema.js';

// Register request schema
export const RegisterRequestSchema = type({
  email: emailType,
  password: PasswordSchema,
});

export type RegisterRequest = typeof RegisterRequestSchema.infer;
