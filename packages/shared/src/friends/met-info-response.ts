import { type } from 'arktype';

export const MetInfoResponseSchema = type({
  id: 'string',
  'metDate?': 'string',
  'metLocation?': 'string',
  'metContext?': 'string',
  createdAt: 'string',
  updatedAt: 'string',
});

export type MetInfoResponse = typeof MetInfoResponseSchema.infer;
