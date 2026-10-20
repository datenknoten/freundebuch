import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';
import { EncounterTitleSchema } from './encounter-title-schema.js';
import { EncounterTypeSchema } from './encounter-type.js';

export const EncounterCreateInputSchema = type({
  'title?': EncounterTitleSchema, // optional; UI derives a label for calls/messages
  encounter_date: IsoDateStringSchema,
  encounter_type: EncounterTypeSchema.default('in_person'),
  friend_ids: 'string.uuid[] > 0',
  'location_text?': 'string | null',
  'description?': 'string | null',
});

export type EncounterCreateInput = typeof EncounterCreateInputSchema.infer;
