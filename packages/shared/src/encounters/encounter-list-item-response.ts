import { type } from 'arktype';
import { EncounterFriendSummaryResponseSchema } from './encounter-friend-summary-response.js';
import { EncounterTypeSchema } from './encounter-type.js';

export const EncounterListItemResponseSchema = type({
  id: 'string',
  title: 'string | null',
  encounterType: EncounterTypeSchema,
  encounterDate: 'string',
  locationText: 'string | null',
  friendCount: 'number',
  /** The first few friends, for a preview */
  friends: EncounterFriendSummaryResponseSchema.array(),
  createdAt: 'string',
});

export type EncounterListItemResponse = typeof EncounterListItemResponseSchema.infer;
