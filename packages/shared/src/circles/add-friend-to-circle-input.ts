import { type } from 'arktype';

export const AddFriendToCircleInputSchema = type({
  circle_id: 'string > 0',
});

export type AddFriendToCircleInput = typeof AddFriendToCircleInputSchema.infer;
