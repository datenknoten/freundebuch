import type { EncounterFriendSummary } from './encounter-friend-summary.js';
import type { EncounterType } from './encounter-type.js';

/** Encounter in list responses (may have fewer details) */
export interface EncounterListItem {
  id: string;
  title: string | null;
  encounterType: EncounterType;
  encounterDate: string;
  locationText: string | null;
  friendCount: number;
  friends: EncounterFriendSummary[]; // First few friends for preview
  createdAt: string;
}
