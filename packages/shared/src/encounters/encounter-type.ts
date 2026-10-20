/**
 * Encounter types and validation schemas for Epic 2: Encounter Management
 */

// ============================================================================
// Interaction Type
// ============================================================================

/** All supported kinds of contact an encounter can represent */
export const ENCOUNTER_TYPES = ['in_person', 'phone_call', 'video_call', 'message'] as const;

export type EncounterType = (typeof ENCOUNTER_TYPES)[number];
