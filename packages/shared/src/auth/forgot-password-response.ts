import { type } from 'arktype';

/** Response from POST /api/auth/forgot-password */
export const ForgotPasswordResponseSchema = type({
  message: 'string',
  'resetToken?': 'string',
});

export type ForgotPasswordResponse = typeof ForgotPasswordResponseSchema.infer;
