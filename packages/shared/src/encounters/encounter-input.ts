import { type } from 'arktype';
import { IsoDateString } from '../dates/iso-date-string.js';
import { encounterTypeDef } from './encounter-type-def.js';
import { isValidTitle } from './is-valid-title.js';

/** Schema for creating an encounter */
export const EncounterInputSchema = type({
  'title?': 'string > 0', // optional; UI derives a label for calls/messages
  encounter_date: 'string', // ISO date string (YYYY-MM-DD)
  encounter_type: `(${encounterTypeDef}) = 'in_person'`,
  friend_ids: 'string.uuid[]', // Array of friend external_ids
  'location_text?': 'string | null',
  'description?': 'string | null',
}).narrow((data, ctx) => {
  // Validate date format
  if (!IsoDateString.allows(data.encounter_date)) {
    ctx.mustBe('an encounter with a valid date (YYYY-MM-DD format)');
    return false;
  }
  // Validate at least one friend
  if (data.friend_ids.length === 0) {
    ctx.mustBe('an encounter with at least one friend');
    return false;
  }
  // Validate the title (when present) matches the DB constraint: non-blank, <= 200 chars
  if (data.title !== undefined && !isValidTitle(data.title)) {
    ctx.mustBe('an encounter with a non-blank title of at most 200 characters');
    return false;
  }
  return true;
});

export type EncounterInput = typeof EncounterInputSchema.infer;
