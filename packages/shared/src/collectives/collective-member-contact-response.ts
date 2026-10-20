import { type } from 'arktype';

/** Friend embedded in collective member responses */
export const CollectiveMemberContactResponseSchema = type({
  id: 'string',
  displayName: 'string',
  photoUrl: 'string | null',
});

export type CollectiveMemberContactResponse = typeof CollectiveMemberContactResponseSchema.infer;
