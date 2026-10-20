import { type } from 'arktype';

/** Schema for archiving a friend */
export const ArchiveFriendInputSchema = type({
  'reason?': 'string',
});

export type ArchiveFriendInput = typeof ArchiveFriendInputSchema.infer;
