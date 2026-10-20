import { type } from 'arktype';

/** Body of PUT /api/users/me/self-profile */
export const SelfProfileSetInputSchema = type({
  friendId: 'string.uuid',
});

export type SelfProfileSetInput = typeof SelfProfileSetInputSchema.infer;
