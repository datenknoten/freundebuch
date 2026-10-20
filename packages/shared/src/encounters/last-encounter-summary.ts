import type { EncounterType } from './encounter-type.js';

/** Last encounter summary for friend detail page */
export interface LastEncounterSummary {
  id: string;
  title: string | null;
  encounterType: EncounterType;
  encounterDate: string;
}
