import type { EncounterType } from '../encounters/encounter-type.js';

/** The encounter where the user learned a note */
export interface FriendNoteEncounter {
  id: string;
  title: string | null;
  encounterType: EncounterType;
  /** YYYY-MM-DD */
  encounterDate: string;
}
