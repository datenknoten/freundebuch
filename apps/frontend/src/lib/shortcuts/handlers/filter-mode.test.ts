import { get, readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardModesStore } from '$lib/stores/keyboard-modes.js';
import { OverlayStore } from '$lib/stores/overlay.js';
import type { HandlerContext, ShortcutStores } from '../types.js';
import { handleFilterMode } from './filter-mode.js';

function createContext(pathname: string, pendingKey: string | null) {
  const stores: ShortcutStores = {
    keyboardModes: new KeyboardModesStore(),
    overlay: new OverlayStore(),
    isAuthenticated: readable(true),
    search: { isOpen: readable(false), toggle: vi.fn() },
    currentFriend: readable(null),
    friendListFilter: readable({ query: '', filters: {} }),
  };
  const clearPending = vi.fn(() => stores.keyboardModes.reset());
  return { pendingKey, pathname, clearPending, stores } satisfies HandlerContext;
}

function keydown(key: string) {
  return new KeyboardEvent('keydown', { key, cancelable: true });
}

function listenFor(eventName: string) {
  const listener = vi.fn();
  window.addEventListener(eventName, listener);
  return listener;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleFilterMode', () => {
  describe('with a category key', () => {
    it('selects the category and stays in filter mode', () => {
      const ctx = createContext('/friends', 'f');

      handleFilterMode(keydown('c'), ctx);

      const { filter } = ctx.stores.keyboardModes;
      expect([
        get(filter.isActive),
        get(filter.category),
        ctx.clearPending.mock.calls.length,
      ]).toEqual([true, 'country', 0]);
    });
  });

  describe('with a selected category', () => {
    it('toggles the value of the pressed digit', () => {
      const ctx = createContext('/friends', 'f');
      ctx.stores.keyboardModes.filter.isActive.set(true);
      ctx.stores.keyboardModes.filter.category.set('city');
      const listener = listenFor('shortcut:filter-toggle');

      handleFilterMode(keydown('2'), ctx);
      window.removeEventListener('shortcut:filter-toggle', listener);

      expect(listener.mock.calls[0]?.[0].detail).toEqual({ category: 'city', index: 1 });
    });

    it('toggles the value of a letter and a digit, then drops the letter', () => {
      const ctx = createContext('/friends', 'f');
      const { filter } = ctx.stores.keyboardModes;
      filter.isActive.set(true);
      filter.category.set('city');
      filter.prefix.set('a');
      const listener = listenFor('shortcut:filter-toggle');

      handleFilterMode(keydown('1'), ctx);
      window.removeEventListener('shortcut:filter-toggle', listener);

      expect([listener.mock.calls[0]?.[0].detail, get(filter.prefix)]).toEqual([
        { category: 'city', index: 9 },
        null,
      ]);
    });
  });

  describe('with x', () => {
    it('clears every filter and leaves filter mode', () => {
      const ctx = createContext('/friends', 'f');
      const listener = listenFor('shortcut:clear-filters');

      handleFilterMode(keydown('x'), ctx);
      window.removeEventListener('shortcut:clear-filters', listener);

      expect([listener.mock.calls.length, ctx.clearPending.mock.calls.length]).toEqual([1, 1]);
    });
  });

  describe('with an unrelated key before a category', () => {
    it('leaves filter mode', () => {
      const ctx = createContext('/friends', 'f');

      handleFilterMode(keydown('5'), ctx);

      expect(ctx.clearPending.mock.calls.length).toBe(1);
    });
  });
});
