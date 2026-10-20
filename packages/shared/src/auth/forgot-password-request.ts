import { type } from 'arktype';
import { emailType } from './email-type.js';

// Forgot password request schema
export const ForgotPasswordRequestSchema = type({
  email: emailType,
});

export type ForgotPasswordRequest = typeof ForgotPasswordRequestSchema.infer;
