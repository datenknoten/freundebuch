import { type } from 'arktype';

/** Friend embedded in encounter responses */
export const EncounterFriendSummaryResponseSchema = type({
  id: 'string',
  displayName: 'string',
  photoUrl: 'string | null',
});

export type EncounterFriendSummaryResponse = typeof EncounterFriendSummaryResponseSchema.infer;
