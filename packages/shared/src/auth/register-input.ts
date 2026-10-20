import { type } from 'arktype';
import { EmailSchema } from './email-schema.js';
import { PasswordSchema } from './password-schema.js';

export const RegisterInputSchema = type({
  email: EmailSchema,
  password: PasswordSchema,
});

export type RegisterInput = typeof RegisterInputSchema.infer;
