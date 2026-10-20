import { type } from 'arktype';

/** Replaces all of the friend's circles. */
export const SetFriendCirclesInputSchema = type({
  circle_ids: 'string.uuid[]',
});

export type SetFriendCirclesInput = typeof SetFriendCirclesInputSchema.infer;
