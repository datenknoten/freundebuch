import { type } from 'arktype';

/** Body of PUT /api/users/me/self-profile */
export const SetSelfProfileSchema = type({
  friendId: 'string.uuid',
});

export type SetSelfProfileRequest = typeof SetSelfProfileSchema.infer;
