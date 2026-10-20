import { type } from 'arktype';

export const CollectiveCircleResponseSchema = type({
  id: 'string',
  name: 'string',
  color: 'string | null',
  createdAt: 'string',
});

export type CollectiveCircleResponse = typeof CollectiveCircleResponseSchema.infer;
