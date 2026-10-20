import { type } from 'arktype';
import { EncounterFriendSummaryResponseSchema } from './encounter-friend-summary-response.js';
import { EncounterTypeSchema } from './encounter-type.js';

export const EncounterResponseSchema = type({
  id: 'string',
  /** Null for calls and messages, where the UI derives a label */
  title: 'string | null',
  encounterType: EncounterTypeSchema,
  /** YYYY-MM-DD */
  encounterDate: 'string',
  locationText: 'string | null',
  description: 'string | null',
  friends: EncounterFriendSummaryResponseSchema.array(),
  createdAt: 'string',
  updatedAt: 'string',
});

export type EncounterResponse = typeof EncounterResponseSchema.infer;
