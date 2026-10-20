import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';
import { EncounterTypeSchema } from './encounter-type.js';
import { isValidTitle } from './is-valid-title.js';

/** Schema for creating an encounter */
export const EncounterCreateInputSchema = type({
  'title?': 'string > 0', // optional; UI derives a label for calls/messages
  encounter_date: 'string', // ISO date string (YYYY-MM-DD)
  encounter_type: EncounterTypeSchema.default('in_person'),
  friend_ids: 'string.uuid[]', // Array of friend external_ids
  'location_text?': 'string | null',
  'description?': 'string | null',
}).narrow((data, ctx) => {
  // Validate date format
  if (!IsoDateStringSchema.allows(data.encounter_date)) {
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

export type EncounterCreateInput = typeof EncounterCreateInputSchema.infer;
