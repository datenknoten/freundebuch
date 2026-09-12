import { type } from 'arktype';
import { IsoDateFilter, IsoDateString } from './dates.js';
import {
  type Paginated,
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from './pagination.js';

/** Rows per page when a client does not ask for a size. */
const DEFAULT_ENCOUNTER_PAGE_SIZE = 20;

/**
 * Encounter types and validation schemas for Epic 2: Encounter Management
 */

// ============================================================================
// Interaction Type
// ============================================================================

/** All supported kinds of contact an encounter can represent */
export const ENCOUNTER_TYPES = ['in_person', 'phone_call', 'video_call', 'message'] as const;
export type EncounterType = (typeof ENCOUNTER_TYPES)[number];

/** arktype literal union for the interaction type */
const encounterTypeDef = "'in_person' | 'phone_call' | 'video_call' | 'message'";

/** Max title length, kept in sync with the DB CHECK constraint on encounters.title */
export const ENCOUNTER_TITLE_MAX_LENGTH = 200;

/** A title is valid when it's non-blank after trimming and within the DB length limit. */
function isValidTitle(title: string): boolean {
  return title.trim().length > 0 && title.length <= ENCOUNTER_TITLE_MAX_LENGTH;
}

// ============================================================================
// Input Schemas
// ============================================================================

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

/** Schema for updating an encounter (all fields optional) */
export const EncounterUpdateSchema = type({
  'title?': 'string > 0 | null',
  'encounter_date?': 'string', // ISO date string (YYYY-MM-DD)
  'encounter_type?': encounterTypeDef,
  'friend_ids?': 'string.uuid[]', // Array of friend external_ids
  'location_text?': 'string | null',
  'description?': 'string | null',
}).narrow((data, ctx) => {
  // Validate the date format whenever the key is present. Testing the string for truthiness
  // instead let `encounter_date: ''` through the boundary and into Postgres.
  if (data.encounter_date !== undefined && !IsoDateString.allows(data.encounter_date)) {
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
export type EncounterUpdate = typeof EncounterUpdateSchema.infer;

/** Schema for encounter list query parameters */
export const EncounterListQuerySchema = PaginationQuerySchema.merge({
  'friend_id?': '"" | string.uuid', // Filter by specific friend
  'from_date?': IsoDateFilter, // Filter from date (YYYY-MM-DD)
  'to_date?': IsoDateFilter, // Filter to date (YYYY-MM-DD)
  'search?': 'string', // Search in title/description
  'type?': encounterTypeDef, // Filter by interaction type
});
export type EncounterListQuery = typeof EncounterListQuerySchema.infer;

/** Parsed encounter list options */
export interface EncounterListOptions extends PaginationOptions {
  friendId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  type?: EncounterType;
}

/**
 * Parse and validate encounter list query parameters
 */
export function parseEncounterListQuery(query: EncounterListQuery): EncounterListOptions {
  return {
    ...parsePaginationQuery(query, DEFAULT_ENCOUNTER_PAGE_SIZE),
    friendId: query.friend_id || undefined,
    fromDate: query.from_date || undefined,
    toDate: query.to_date || undefined,
    search: query.search || undefined,
    type: query.type || undefined,
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
  /** User-provided title; null for calls/messages where the UI derives a label */
  title: string | null;
  encounterType: EncounterType;
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
  title: string | null;
  encounterType: EncounterType;
  encounterDate: string;
  locationText: string | null;
  friendCount: number;
  friends: EncounterFriendSummary[]; // First few friends for preview
  createdAt: string;
}

/** Paginated encounter list response */
export type EncounterListResponse = Paginated<EncounterListItem>;

/** Last encounter summary for friend detail page */
export interface LastEncounterSummary {
  id: string;
  title: string | null;
  encounterType: EncounterType;
  encounterDate: string;
}
