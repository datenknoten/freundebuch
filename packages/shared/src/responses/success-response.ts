import { type } from 'arktype';

export const SuccessResponseSchema = type({
  success: 'boolean',
});

export type SuccessResponse = typeof SuccessResponseSchema.infer;
