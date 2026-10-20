import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { FriendListFilterStore } from './friend-list-filter.js';

describe('FriendListFilterStore', () => {
  describe('when nothing was set', () => {
    it('holds an empty query and no filters', () => {
      expect(get(new FriendListFilterStore())).toEqual({ query: '', filters: {} });
    });
  });

  describe('setState', () => {
    it('replaces query and filters together', () => {
      const store = new FriendListFilterStore();
      store.setState('ada', { city: ['Berlin'] });

      store.setState('bob', { country: ['DE'] });

      expect(get(store)).toEqual({ query: 'bob', filters: { country: ['DE'] } });
    });
  });
});
