import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';

/** Rows per page when a client does not ask for a size. */
const DEFAULT_COLLECTIVE_PAGE_SIZE = 20;

export const CollectiveListQuerySchema = PaginationQuerySchema.merge({
  // Collective type external_id; empty means no filter.
  'type_id?': '"" | string.uuid',
  // Matches name and notes.
  'search?': 'string',
  // "true" includes soft-deleted collectives.
  'include_deleted?': 'string',
});

export type CollectiveListQuery = typeof CollectiveListQuerySchema.infer;

export interface CollectiveListOptions extends PaginationOptions {
  typeId?: string;
  search?: string;
  shouldIncludeDeleted?: boolean;
}

export function parseCollectiveListQuery(query: CollectiveListQuery) {
  const options: CollectiveListOptions = {
    ...parsePaginationQuery(query, DEFAULT_COLLECTIVE_PAGE_SIZE),
    typeId: query.type_id === '' ? undefined : query.type_id,
    search: query.search === '' ? undefined : query.search,
    shouldIncludeDeleted: query.include_deleted === 'true',
  };
  return options;
}
