import { type Readable, writable } from 'svelte/store';
import type { FacetFilters } from '$shared';

export interface FriendListFilterState {
  query: string;
  filters: FacetFilters;
}

const INITIAL_STATE: FriendListFilterState = { query: '', filters: {} };

/** The search and facet filters of the friend list, kept so a return to the list restores them. */
export class FriendListFilterStore {
  public readonly subscribe: Readable<FriendListFilterState>['subscribe'];
  private readonly state = writable(INITIAL_STATE);

  public constructor() {
    this.subscribe = this.state.subscribe;
  }

  public setState(query: string, filters: FacetFilters) {
    this.state.set({ query, filters });
  }
}
