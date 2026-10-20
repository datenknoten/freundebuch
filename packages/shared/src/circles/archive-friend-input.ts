import { type } from 'arktype';

export const ArchiveFriendInputSchema = type({
  'reason?': 'string',
});

export type ArchiveFriendInput = typeof ArchiveFriendInputSchema.infer;
