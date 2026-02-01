import { type } from 'arktype';

/**
 * Encounter types and validation schemas for Epic 2: Encounter Management
 */

// ============================================================================
// Input Schemas
// ============================================================================

/** Schema for creating an encounter */
export const EncounterInputSchema = type({
  title: 'string > 0',
  encounter_date: 'string', // ISO date string (YYYY-MM-DD)
  friend_ids: 'string[]', // Array of friend external_ids
  'location_text?': 'string | null',
  'description?': 'string | null',
}).narrow((data, ctx) => {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.encounter_date)) {
    ctx.mustBe('an encounter with a valid date (YYYY-MM-DD format)');
    return false;
  }
  // Validate at least one friend
  if (data.friend_ids.length === 0) {
    ctx.mustBe('an encounter with at least one friend');
    return false;
  }
  return true;
});
export type EncounterInput = typeof EncounterInputSchema.infer;

/** Schema for updating an encounter (all fields optional) */
export const EncounterUpdateSchema = type({
  'title?': 'string > 0',
  'encounter_date?': 'string', // ISO date string (YYYY-MM-DD)
  'friend_ids?': 'string[]', // Array of friend external_ids
  'location_text?': 'string | null',
  'description?': 'string | null',
}).narrow((data, ctx) => {
  // Validate date format if provided
  if (data.encounter_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.encounter_date)) {
    ctx.mustBe('an encounter with a valid date (YYYY-MM-DD format)');
    return false;
  }
  // Validate at least one friend if friend_ids is provided
  if (data.friend_ids !== undefined && data.friend_ids.length === 0) {
    ctx.mustBe('an encounter with at least one friend');
    return false;
  }
  return true;
});
export type EncounterUpdate = typeof EncounterUpdateSchema.infer;

/** Schema for encounter list query parameters */
export const EncounterListQuerySchema = type({
  'page?': 'string',
  'page_size?': 'string',
  'friend_id?': 'string', // Filter by specific friend
  'from_date?': 'string', // Filter from date (YYYY-MM-DD)
  'to_date?': 'string', // Filter to date (YYYY-MM-DD)
  'search?': 'string', // Search in title/description
});
export type EncounterListQuery = typeof EncounterListQuerySchema.infer;

/** Parsed encounter list options */
export interface EncounterListOptions {
  page: number;
  pageSize: number;
  friendId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

/**
 * Parse and validate encounter list query parameters
 */
export function parseEncounterListQuery(query: EncounterListQuery): EncounterListOptions {
  const page = query.page ? parseInt(query.page, 10) : 1;
  const pageSize = query.page_size ? parseInt(query.page_size, 10) : 20;

  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    pageSize: Number.isNaN(pageSize) || pageSize < 1 ? 20 : Math.min(pageSize, 100),
    friendId: query.friend_id || undefined,
    fromDate: query.from_date || undefined,
    toDate: query.to_date || undefined,
    search: query.search || undefined,
  };
}

// ============================================================================
// Response Interfaces
// ============================================================================

/** Friend summary for embedding in encounter responses */
export interface EncounterFriendSummary {
  id: string;
  displayName: string;
  photoUrl: string | null;
}

/** Full encounter in API responses */
export interface Encounter {
  id: string;
  title: string;
  encounterDate: string; // ISO date string (YYYY-MM-DD)
  locationText: string | null;
  description: string | null;
  friends: EncounterFriendSummary[];
  createdAt: string;
  updatedAt: string;
}

/** Encounter in list responses (may have fewer details) */
export interface EncounterListItem {
  id: string;
  title: string;
  encounterDate: string;
  locationText: string | null;
  friendCount: number;
  friends: EncounterFriendSummary[]; // First few friends for preview
  createdAt: string;
}

/** Paginated encounter list response */
export interface EncounterListResponse {
  encounters: EncounterListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

/** Last encounter summary for friend detail page */
export interface LastEncounterSummary {
  id: string;
  title: string;
  encounterDate: string;
}
