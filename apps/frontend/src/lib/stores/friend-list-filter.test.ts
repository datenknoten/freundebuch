import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$shared', () => ({}));

import {
  buildSearchParams,
  friendListFilter,
  friendListQuery,
  hasFriendListFilters,
  parseSearchParams,
} from './friend-list-filter.js';

describe('friendListFilter store', () => {
  afterEach(() => {
    friendListFilter.clear();
  });

  it('starts empty', () => {
    expect(get(friendListFilter)).toEqual({ query: '', filters: {} });
    expect(get(hasFriendListFilters)).toBe(false);
  });

  it('setQuery updates the query and the derived query store', () => {
    friendListFilter.setQuery('ada');

    expect(get(friendListFilter).query).toBe('ada');
    expect(get(friendListQuery)).toBe('ada');
  });

  it('setFilters replaces the filters', () => {
    friendListFilter.setFilters({ city: ['Berlin'] });

    expect(get(friendListFilter).filters).toEqual({ city: ['Berlin'] });
  });

  it('setState replaces query and filters together', () => {
    friendListFilter.setState('bob', { country: ['DE'] });

    expect(get(friendListFilter)).toEqual({ query: 'bob', filters: { country: ['DE'] } });
  });

  it('clear resets to the initial state', () => {
    friendListFilter.setState('x', { city: ['Berlin'] });

    friendListFilter.clear();

    expect(get(friendListFilter)).toEqual({ query: '', filters: {} });
  });

  describe('hasFriendListFilters', () => {
    it('is true when a non-whitespace query is set', () => {
      friendListFilter.setQuery('  hello  ');
      expect(get(hasFriendListFilters)).toBe(true);
    });

    it('is false for a whitespace-only query', () => {
      friendListFilter.setQuery('   ');
      expect(get(hasFriendListFilters)).toBe(false);
    });

    it('is true when any filter has values', () => {
      friendListFilter.setFilters({ city: ['Berlin'] });
      expect(get(hasFriendListFilters)).toBe(true);
    });

    it('is false when filters are present but empty', () => {
      friendListFilter.setFilters({ city: [] });
      expect(get(hasFriendListFilters)).toBe(false);
    });
  });
});

describe('buildSearchParams / parseSearchParams', () => {
  it('omits an empty or whitespace-only query', () => {
    expect(buildSearchParams({ query: '   ', filters: {} }).toString()).toBe('');
  });

  it('trims the query and joins filter values with commas', () => {
    const params = buildSearchParams({
      query: '  ada  ',
      filters: { city: ['Berlin', 'Munich'], country: ['DE'] },
    });

    expect(params.get('q')).toBe('ada');
    expect(params.get('city')).toBe('Berlin,Munich');
    expect(params.get('country')).toBe('DE');
  });

  it('skips filter keys with no values', () => {
    const params = buildSearchParams({ query: '', filters: { city: [], country: ['DE'] } });

    expect(params.has('city')).toBe(false);
    expect(params.get('country')).toBe('DE');
  });

  it('parses query and known string-array facets', () => {
    const params = new URLSearchParams('q=ada&city=Berlin,Munich&circles=close');

    const state = parseSearchParams(params);

    expect(state.query).toBe('ada');
    expect(state.filters.city).toEqual(['Berlin', 'Munich']);
    expect(state.filters.circles).toEqual(['close']);
  });

  it('parses the relationship_category facet', () => {
    const state = parseSearchParams(new URLSearchParams('relationship_category=family,social'));

    expect(state.filters.relationship_category).toEqual(['family', 'social']);
  });

  it('round-trips a populated state through build then parse', () => {
    const original = {
      query: 'ada',
      filters: { city: ['Berlin'], organization: ['ACME'] },
    };

    const reparsed = parseSearchParams(buildSearchParams(original));

    expect(reparsed).toEqual(original);
  });
});
