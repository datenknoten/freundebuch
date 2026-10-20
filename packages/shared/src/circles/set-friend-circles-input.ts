import { type } from 'arktype';

/** Schema for setting friend circles (replaces all) */
export const SetFriendCirclesSchema = type({
  circle_ids: 'string.uuid[]', // Array of circle external_ids
});

export type SetFriendCirclesInput = typeof SetFriendCirclesSchema.infer;
