import { type } from 'arktype';
import { EncounterTypeSchema } from '../encounters/encounter-type.js';

/** The encounter where the user learned a note */
export const FriendNoteEncounterResponseSchema = type({
  id: 'string',
  title: 'string | null',
  encounterType: EncounterTypeSchema,
  /** YYYY-MM-DD */
  encounterDate: 'string',
});

export type FriendNoteEncounterResponse = typeof FriendNoteEncounterResponseSchema.infer;
