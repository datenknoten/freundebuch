import {
  type PaginationOptions,
  PaginationQuerySchema,
  parsePaginationQuery,
} from '../pagination/pagination-query.js';

/** Rows per page when a client does not ask for a size. */
const DEFAULT_COLLECTIVE_PAGE_SIZE = 20;

/** Schema for collective list query parameters */
export const CollectiveListQuerySchema = PaginationQuerySchema.merge({
  'type_id?': '"" | string.uuid', // Filter by collective type external_id
  'search?': 'string', // Search in name/notes
  'include_deleted?': 'string', // "true" to include soft-deleted collectives
});

export type CollectiveListQuery = typeof CollectiveListQuerySchema.infer;

/** Parsed collective list options */
export interface CollectiveListOptions extends PaginationOptions {
  typeId?: string;
  search?: string;
  shouldIncludeDeleted?: boolean;
}

/**
 * Parse and validate collective list query parameters
 */
export function parseCollectiveListQuery(query: CollectiveListQuery): CollectiveListOptions {
  return {
    ...parsePaginationQuery(query, DEFAULT_COLLECTIVE_PAGE_SIZE),
    typeId: query.type_id || undefined,
    search: query.search || undefined,
    shouldIncludeDeleted: query.include_deleted === 'true',
  };
}
