/**
 * The one pagination contract: what a paginated endpoint accepts, what it
 * resolves that to, and what it returns.
 */

import { type } from 'arktype';

/** Upper bound on rows per page, enforced for every list endpoint. */
export const MAX_PAGE_SIZE = 100;

/**
 * The pagination half of every list query, validated at the boundary like any
 * other client input. Endpoints compose it with `.merge()`:
 *
 * ```ts
 * export const CollectiveListQuerySchema = PaginationQuerySchema.merge({
 *   'search?': 'string',
 * });
 * ```
 *
 * Composing rather than re-declaring is the point. It drifted before:
 * `/api/friends` and the search endpoints took `pageSize` while
 * `/api/collectives` and `/api/encounters` took `page_size`. ArkType's default
 * `onUndeclaredKey` is `ignore`, which passes an undeclared key straight
 * through rather than rejecting it, so the wrong spelling was accepted, never
 * read, and had no effect: `?page_size=3` against `/api/friends` returned
 * every row with `pageSize: 25` and no error.
 *
 * `page_size` is the only accepted spelling, matching every other query and
 * request-body field in the API. Note this is the *wire* name only: the parsed
 * `PaginationOptions` and the `PaginationInfo` in every response stay
 * camelCase like the rest of the JSON.
 */
export const PaginationQuerySchema = type({
  'page?': 'string',
  'page_size?': 'string',
});

/** The raw, unparsed pagination half of a list query. */
export type PaginationQuery = typeof PaginationQuerySchema.infer;

/**
 * A resolved, always-valid page request. Every endpoint's own options
 * interface extends this rather than re-declaring the two fields.
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/** Pagination metadata for paginated API responses. */
export interface PaginationInfo extends PaginationOptions {
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

/** Read a positive integer from a query string value, or undefined. */
function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return undefined;
  }
  return parsed;
}

/**
 * Normalize the pagination half of a list query.
 *
 * Anything unusable — absent, empty, non-numeric, zero, negative — falls back
 * to the default rather than to a boundary value, so `?page_size=0` returns a
 * normal page instead of a single row.
 *
 * `defaultPageSize` stays per-endpoint because the existing defaults differ
 * (25 for friends and search, 20 for collectives and encounters) and changing
 * them would change what every unparameterised client receives.
 */
export function parsePaginationQuery(
  query: PaginationQuery,
  defaultPageSize: number,
): PaginationOptions {
  return {
    page: parsePositiveInt(query.page) ?? 1,
    pageSize: Math.min(MAX_PAGE_SIZE, parsePositiveInt(query.page_size) ?? defaultPageSize),
  };
}
