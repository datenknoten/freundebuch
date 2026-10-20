import type { FriendListFilterState } from './friend-list-filter.js';

/** The friend list URL query for a filter state: `q` plus one comma-joined param per facet. */
export function buildSearchParams(state: FriendListFilterState) {
  const params = new URLSearchParams();
  const query = state.query.trim();
  if (query.length > 0) {
    params.set('q', query);
  }
  for (const [key, values] of Object.entries(state.filters)) {
    if (Array.isArray(values) === true && values.length > 0) {
      params.set(key, values.join(','));
    }
  }
  return params;
}
