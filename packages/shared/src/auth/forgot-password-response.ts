import { type } from 'arktype';

export const ForgotPasswordResponseSchema = type({
  message: 'string',
  'resetToken?': 'string',
});

export type ForgotPasswordResponse = typeof ForgotPasswordResponseSchema.infer;
