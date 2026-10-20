import { type } from 'arktype';

/** Schema for archiving a friend */
export const ArchiveFriendSchema = type({
  'reason?': 'string',
});

export type ArchiveFriendInput = typeof ArchiveFriendSchema.infer;
