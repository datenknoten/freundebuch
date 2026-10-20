import { type } from 'arktype';

/** Schema for adding friend to a single circle */
export const AddFriendToCircleSchema = type({
  circle_id: 'string > 0', // Circle external_id
});

export type AddFriendToCircleInput = typeof AddFriendToCircleSchema.infer;
