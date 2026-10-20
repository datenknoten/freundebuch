import { type } from 'arktype';
import { emailType } from './email-type.js';

// Login request schema
export const LoginRequestSchema = type({
  email: emailType,
  password: 'string>0',
});

export type LoginRequest = typeof LoginRequestSchema.infer;
