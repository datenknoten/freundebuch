import { derived, writable } from 'svelte/store';
import type { FacetFilters } from '$shared';

export interface FriendListFilterState {
  query: string;
  filters: FacetFilters;
}

const initialFilterState: FriendListFilterState = {
  query: '',
  filters: {},
};

function createFriendListFilterStore() {
  const { subscribe, set, update } = writable<FriendListFilterState>(initialFilterState);

  return {
    subscribe,

    setQuery: (query: string) => {
      update((state) => ({ ...state, query }));
    },

    setFilters: (filters: FacetFilters) => {
      update((state) => ({ ...state, filters }));
    },

    setState: (query: string, filters: FacetFilters) => {
      set({ query, filters });
    },

    clear: () => {
      set(initialFilterState);
    },
  };
}

export const friendListFilter = createFriendListFilterStore();

export const friendListQuery = derived(friendListFilter, ($filter) => $filter.query);

export const hasFriendListFilters = derived(
  friendListFilter,
  ($filter) =>
    $filter.query.trim().length > 0 ||
    Object.values($filter.filters).some((arr) => arr && arr.length > 0),
);

/**
 * Build URL search params from filter state.
 * Pure utility — does not read the store; pass a state snapshot.
 */
export function buildSearchParams(state: FriendListFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.query.trim()) {
    params.set('q', state.query.trim());
  }

  for (const [key, values] of Object.entries(state.filters)) {
    if (values && values.length > 0) {
      params.set(key, values.join(','));
    }
  }

  return params;
}

/**
 * Parse URL search params into filter state.
 * Pure utility — does not read the store.
 */
export function parseSearchParams(params: URLSearchParams): FriendListFilterState {
  const query = params.get('q') ?? '';
  const filters: FacetFilters = {};

  const stringArrayKeys = [
    'country',
    'city',
    'organization',
    'job_title',
    'department',
    'circles',
  ] as const;
  for (const key of stringArrayKeys) {
    const value = params.get(key);
    if (value) {
      filters[key] = value.split(',');
    }
  }

  const relationshipCategory = params.get('relationship_category');
  if (relationshipCategory) {
    filters.relationship_category = relationshipCategory.split(',') as (
      | 'family'
      | 'professional'
      | 'social'
    )[];
  }

  return { query, filters };
}
