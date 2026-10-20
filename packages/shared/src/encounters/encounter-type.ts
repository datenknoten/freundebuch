import { type } from 'arktype';

/** All supported kinds of contact an encounter can represent */
export const ENCOUNTER_TYPES = ['in_person', 'phone_call', 'video_call', 'message'] as const;

export const EncounterTypeSchema = type.enumerated(...ENCOUNTER_TYPES);

export type EncounterType = (typeof ENCOUNTER_TYPES)[number];
