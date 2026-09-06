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

/**
 * The one shape every paginated endpoint returns.
 *
 * Before this existed each endpoint invented its own: `{ friends, total, page,
 * pageSize, totalPages }`, `{ results, total, … }`, `{ collectives, pagination }`,
 * `{ encounters, pagination }`. Three envelopes and two places to look for the
 * total meant every consumer special-cased the endpoint it was talking to.
 */
export interface Paginated<T> {
  data: T[];
  pagination: PaginationInfo;
}
