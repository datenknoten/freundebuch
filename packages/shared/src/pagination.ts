/**
 * Shared pagination types used across encounter, collective, and other paginated responses
 */

/** Pagination metadata for paginated API responses */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
