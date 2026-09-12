import { describe, expect, it } from 'vitest';
import {
  FacetedSearchQuerySchema,
  FriendListQuerySchema,
  parseFacetedSearchQuery,
  parseFriendListQuery,
  parseSearchQuery,
  SearchQuerySchema,
} from './friends.js';
import { parseSortQuery, type SortOrder } from './sorting.js';

describe('parseSortQuery', () => {
  it('falls back to the endpoint defaults', () => {
    expect(parseSortQuery({}, { sortBy: 'display_name', sortOrder: 'asc' })).toEqual({
      sortBy: 'display_name',
      sortOrder: 'asc',
    });
  });

  it('reads sort_by and sort_order from the query', () => {
    expect(
      parseSortQuery(
        { sort_by: 'created_at', sort_order: 'desc' },
        { sortBy: 'display_name', sortOrder: 'asc' },
      ),
    ).toEqual({ sortBy: 'created_at', sortOrder: 'desc' });
  });

  /**
   * The default direction depends on the resolved field — relevance reads
   * best-first, a name reads A-to-Z — so the default is a function of it.
   */
  it('derives the default order from the resolved field', () => {
    const byField = (sortBy: string): SortOrder => (sortBy === 'display_name' ? 'asc' : 'desc');

    expect(parseSortQuery({}, { sortBy: 'display_name', sortOrder: byField }).sortOrder).toBe(
      'asc',
    );
    expect(parseSortQuery({}, { sortBy: 'created_at', sortOrder: byField }).sortOrder).toBe('desc');
  });

  it('lets an explicit sort_order win over the derived default', () => {
    expect(
      parseSortQuery(
        { sort_by: 'display_name', sort_order: 'desc' },
        {
          sortBy: 'relevance',
          sortOrder: () => 'asc',
        },
      ).sortOrder,
    ).toBe('desc');
  });
});

/**
 * `sortBy`/`sortOrder` were camelCase while every filter beside them
 * (`type_id`, `from_date`, `include_deleted`) was snake_case. Going through
 * `sortQueryFields` is what keeps the wire names identical across endpoints.
 */
describe('every sortable endpoint uses the same sort parameters', () => {
  it('friends list sorts by its own fields', () => {
    expect(parseFriendListQuery({ sort_by: 'created_at', sort_order: 'desc' })).toMatchObject({
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    expect(parseFriendListQuery({})).toMatchObject({ sortBy: 'display_name', sortOrder: 'asc' });
  });

  it('friends list rejects a field it cannot sort by', () => {
    // `relevance` is meaningful for search, not for a plain listing.
    expect(String(FriendListQuerySchema({ sort_by: 'relevance' }))).toContain('sort_by');
  });

  it('search defaults to relevance, descending', () => {
    expect(parseSearchQuery({ q: 'alice' })).toMatchObject({
      sortBy: 'relevance',
      sortOrder: 'desc',
    });
  });

  it('search sorted by name runs ascending', () => {
    expect(parseSearchQuery({ q: 'alice', sort_by: 'display_name' })).toMatchObject({
      sortBy: 'display_name',
      sortOrder: 'asc',
    });
  });

  it('faceted search sorts by name when there is no query to be relevant to', () => {
    expect(parseFacetedSearchQuery({})).toMatchObject({
      sortBy: 'display_name',
      sortOrder: 'asc',
    });
    expect(parseFacetedSearchQuery({ q: 'alice' })).toMatchObject({
      sortBy: 'relevance',
      sortOrder: 'desc',
    });
  });

  it('faceted search takes include_facets in snake_case', () => {
    expect(parseFacetedSearchQuery({ include_facets: 'true' }).includeFacets).toBe(true);
    expect(parseFacetedSearchQuery({}).includeFacets).toBe(false);
  });

  it.each([
    ['friends', FriendListQuerySchema],
    ['search', SearchQuerySchema],
    ['faceted search', FacetedSearchQuerySchema],
  ])('%s declares sort_by and sort_order', (_name, schema) => {
    const out = schema({ q: 'alice', sort_by: 'display_name', sort_order: 'asc' });
    expect(out).toMatchObject({ sort_by: 'display_name', sort_order: 'asc' });
  });
});
