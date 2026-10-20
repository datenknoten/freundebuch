import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { KeyboardModesStore } from './keyboard-modes.js';

describe('KeyboardModesStore', () => {
  describe('reset', () => {
    it('leaves every active mode and drops its prefix', () => {
      const modes = new KeyboardModesStore();
      modes.friends.isActive.set(true);
      modes.friends.prefix.set('a');
      modes.deleteCircle.isActive.set(true);

      modes.reset();

      expect([
        get(modes.friends.isActive),
        get(modes.friends.prefix),
        get(modes.deleteCircle.isActive),
      ]).toEqual([false, null, false]);
    });

    it('drops the selected filter category', () => {
      const modes = new KeyboardModesStore();
      modes.filter.isActive.set(true);
      modes.filter.category.set('city');
      modes.filter.prefix.set('b');

      modes.reset();

      expect([
        get(modes.filter.isActive),
        get(modes.filter.category),
        get(modes.filter.prefix),
      ]).toEqual([false, null, null]);
    });

    it('keeps the items the current page lists', () => {
      const modes = new KeyboardModesStore();
      modes.encounters.visibleItems.set(['encounter-1']);
      modes.visibleCircleIds.set(['circle-1']);

      modes.reset();

      expect([get(modes.encounters.visibleItems), get(modes.visibleCircleIds)]).toEqual([
        ['encounter-1'],
        ['circle-1'],
      ]);
    });
  });
});
