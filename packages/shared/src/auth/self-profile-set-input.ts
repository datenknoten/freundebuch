import { type } from 'arktype';

export const SelfProfileSetInputSchema = type({
  friendId: 'string.uuid',
});

export type SelfProfileSetInput = typeof SelfProfileSetInputSchema.infer;
