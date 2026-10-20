import { type } from 'arktype';

export const AppPasswordResponseSchema = type({
  externalId: 'string',
  name: 'string',
  lastUsedAt: 'string | null',
  createdAt: 'string',
});

export type AppPasswordResponse = typeof AppPasswordResponseSchema.infer;
