import { type } from 'arktype';

export const CircleResponseSchema = type({
  id: 'string',
  name: 'string',
  color: 'string | null',
  parentCircleId: 'string | null',
  sortOrder: 'number',
  friendCount: 'number',
  createdAt: 'string',
  updatedAt: 'string',
});

export type CircleResponse = typeof CircleResponseSchema.infer;
