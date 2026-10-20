import { type } from 'arktype';

/**
 * Friend types and validation schemas for Epic 1A & 1B: Friend CRUD & Extended Fields
 * Extended for Epic 4: Categorization & Organization (circles, favorites, archive)
 */

// ============================================================================
// Type Enums
// ============================================================================

export const PhoneTypeSchema = type('"mobile" | "home" | "work" | "fax" | "other"');

export type PhoneType = typeof PhoneTypeSchema.infer;
