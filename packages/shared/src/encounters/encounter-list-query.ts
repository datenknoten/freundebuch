import { IsoDateFilterSchema } from '../dates/iso-date-filter-schema.js';
import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';
import { type EncounterType, EncounterTypeSchema } from './encounter-type.js';

/** Rows per page when a client does not ask for a size. */
const DEFAULT_ENCOUNTER_PAGE_SIZE = 20;

export const EncounterListQuerySchema = PaginationQuerySchema.merge({
  'friend_id?': '"" | string.uuid',
  'from_date?': IsoDateFilterSchema,
  'to_date?': IsoDateFilterSchema,
  // Matches title and description.
  'search?': 'string',
  'type?': EncounterTypeSchema,
});

export type EncounterListQuery = typeof EncounterListQuerySchema.infer;

export interface EncounterListOptions extends PaginationOptions {
  friendId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  type?: EncounterType;
}

function emptyToUndefined<T extends string>(value: T | undefined) {
  return value === '' ? undefined : value;
}

export function parseEncounterListQuery(query: EncounterListQuery) {
  const options: EncounterListOptions = {
    ...parsePaginationQuery(query, DEFAULT_ENCOUNTER_PAGE_SIZE),
    friendId: emptyToUndefined(query.friend_id),
    fromDate: emptyToUndefined(query.from_date),
    toDate: emptyToUndefined(query.to_date),
    search: emptyToUndefined(query.search),
    type: query.type,
  };
  return options;
}
