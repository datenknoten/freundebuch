import { IsoDateFilter } from '../dates/iso-date-filter.js';
import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';
import type { EncounterType } from './encounter-type.js';
import { encounterTypeDef } from './encounter-type-def.js';

/** Rows per page when a client does not ask for a size. */
const DEFAULT_ENCOUNTER_PAGE_SIZE = 20;

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
