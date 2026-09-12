/**
 * The one sorting contract, the sibling of `pagination.ts`: what a sortable
 * list endpoint accepts and what it resolves that to.
 *
 * `sort_by` cannot be a single shared schema the way `page_size` is — the
 * sortable fields differ per endpoint, and they should: `/api/friends` has no
 * relevance to sort by. What *is* shared is everything around it — the
 * `sort_order` domain, the wire names, the resolved shape and the defaulting —
 * so the endpoint supplies only its own field domain and inherits the rest.
 */

import { type } from 'arktype';

export const SortOrderSchema = type('"asc" | "desc"');
export type SortOrder = typeof SortOrderSchema.infer;

/**
 * The sorting half of a list query, for an endpoint whose sortable fields are
 * described by `sortBy`. Merge it into the endpoint's schema:
 *
 * ```ts
 * export const FriendListQuerySchema = PaginationQuerySchema.merge(
 *   sortQueryFields(FriendSortBySchema),
 * );
 * ```
 *
 * A factory rather than a constant because only `sort_order` is common; going
 * through it is what keeps the wire names identical across endpoints, which
 * `sortBy`/`sortOrder` were not — they were camelCase while every filter
 * beside them (`type_id`, `from_date`, `include_deleted`) was snake_case.
 */
export function sortQueryFields<SortBy>(sortBy: SortBy) {
  return {
    'sort_by?': sortBy,
    'sort_order?': SortOrderSchema,
  } as const;
}

/** The raw, unparsed sorting half of a list query. */
export interface SortQuery<SortBy extends string> {
  sort_by?: SortBy;
  sort_order?: SortOrder;
}

/**
 * A resolved sort. Every sortable endpoint's options interface extends this
 * rather than re-declaring the pair, the same way `PaginationOptions` covers
 * paging.
 */
export interface SortOptions<SortBy extends string> {
  sortBy: SortBy;
  sortOrder: SortOrder;
}

/**
 * Normalize the sorting half of a list query.
 *
 * `defaultSortOrder` takes the resolved field, because the sensible direction
 * depends on it: relevance reads best-first (`desc`) while a name reads
 * A-to-Z (`asc`). An endpoint with one obvious direction passes a constant.
 */
export function parseSortQuery<SortBy extends string>(
  query: SortQuery<SortBy>,
  defaults: {
    sortBy: SortBy;
    sortOrder: SortOrder | ((sortBy: SortBy) => SortOrder);
  },
): SortOptions<SortBy> {
  const sortBy = query.sort_by ?? defaults.sortBy;
  const fallbackOrder =
    typeof defaults.sortOrder === 'function' ? defaults.sortOrder(sortBy) : defaults.sortOrder;

  return {
    sortBy,
    sortOrder: query.sort_order ?? fallbackOrder,
  };
}
