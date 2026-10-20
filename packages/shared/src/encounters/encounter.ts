import type { EncounterFriendSummary } from './encounter-friend-summary.js';
import type { EncounterType } from './encounter-type.js';

/** Full encounter in API responses */
export interface Encounter {
  id: string;
  /** User-provided title; null for calls/messages where the UI derives a label */
  title: string | null;
  encounterType: EncounterType;
  encounterDate: string; // ISO date string (YYYY-MM-DD)
  locationText: string | null;
  description: string | null;
  friends: EncounterFriendSummary[];
  createdAt: string;
  updatedAt: string;
}
