import { type } from 'arktype';
import { EncounterTypeSchema } from './encounter-type.js';

export const LastEncounterSummaryResponseSchema = type({
  id: 'string',
  title: 'string | null',
  encounterType: EncounterTypeSchema,
  encounterDate: 'string',
});

export type LastEncounterSummaryResponse = typeof LastEncounterSummaryResponseSchema.infer;
