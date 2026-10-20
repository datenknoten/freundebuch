import { type } from 'arktype';

export const MessageResponseSchema = type({
  message: 'string',
});

export type MessageResponse = typeof MessageResponseSchema.infer;
