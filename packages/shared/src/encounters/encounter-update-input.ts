import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';
import { EncounterTypeSchema } from './encounter-type.js';
import { isValidTitle } from './is-valid-title.js';

/** Schema for updating an encounter (all fields optional) */
export const EncounterUpdateInputSchema = type({
  'title?': 'string > 0 | null',
  'encounter_date?': 'string', // ISO date string (YYYY-MM-DD)
  'encounter_type?': EncounterTypeSchema,
  'friend_ids?': 'string.uuid[]', // Array of friend external_ids
  'location_text?': 'string | null',
  'description?': 'string | null',
}).narrow((data, ctx) => {
  // Validate the date format whenever the key is present. Testing the string for truthiness
  // instead let `encounter_date: ''` through the boundary and into Postgres.
  if (data.encounter_date !== undefined && !IsoDateStringSchema.allows(data.encounter_date)) {
    ctx.mustBe('an encounter with a valid date (YYYY-MM-DD format)');
    return false;
  }
  // Validate at least one friend if friend_ids is provided
  if (data.friend_ids !== undefined && data.friend_ids.length === 0) {
    ctx.mustBe('an encounter with at least one friend');
    return false;
  }
  // A provided (non-null) title must match the DB constraint: non-blank, <= 200 chars
  if (typeof data.title === 'string' && !isValidTitle(data.title)) {
    ctx.mustBe('an encounter with a non-blank title of at most 200 characters');
    return false;
  }
  return true;
});

export type EncounterUpdateInput = typeof EncounterUpdateInputSchema.infer;
