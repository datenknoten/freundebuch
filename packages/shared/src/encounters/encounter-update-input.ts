import { type } from 'arktype';
import { IsoDateStringSchema } from '../dates/iso-date-string-schema.js';
import { EncounterTitleSchema } from './encounter-title-schema.js';
import { EncounterTypeSchema } from './encounter-type.js';

/** Schema for updating an encounter (all fields optional) */
export const EncounterUpdateInputSchema = type({
  'title?': EncounterTitleSchema.or('null'),
  'encounter_date?': IsoDateStringSchema,
  'encounter_type?': EncounterTypeSchema,
  'friend_ids?': 'string.uuid[] > 0', // Array of friend external_ids
  'location_text?': 'string | null',
  'description?': 'string | null',
});

export type EncounterUpdateInput = typeof EncounterUpdateInputSchema.infer;
