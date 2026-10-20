import { type } from 'arktype';

export const ErrorResponseSchema = type({
  error: 'string',
  'code?': 'string',
  'details?': 'unknown',
});

export type ErrorResponse = typeof ErrorResponseSchema.infer;
