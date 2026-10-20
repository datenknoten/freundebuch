import { get, readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardModesStore } from '$lib/stores/keyboard-modes.js';
import { OverlayStore } from '$lib/stores/overlay.js';
import type { HandlerContext, ShortcutStores } from '../types.js';
import { handleOpenMode } from './open-mode.js';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

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

const FRIEND_IDS = Array.from({ length: 12 }, (_value, index) => `friend-${index}`);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleOpenMode', () => {
  describe('on the friends list', () => {
    it('opens the friend whose digit was pressed', () => {
      const ctx = createContext('/friends', 'o');
      ctx.stores.keyboardModes.friends.visibleItems.set(FRIEND_IDS);

      handleOpenMode(keydown('3'), ctx);

      expect([goto.mock.calls, ctx.clearPending.mock.calls.length]).toEqual([
        [['/friends/friend-2']],
        1,
      ]);
    });

    it('remembers a letter that starts a group and waits for the digit', () => {
      const ctx = createContext('/friends', 'o');
      ctx.stores.keyboardModes.friends.visibleItems.set(FRIEND_IDS);

      handleOpenMode(keydown('a'), ctx);

      expect([get(ctx.stores.keyboardModes.friends.prefix), goto.mock.calls.length]).toEqual([
        'a',
        0,
      ]);
    });

    it('opens the friend of a letter and a digit', () => {
      const ctx = createContext('/friends', 'o');
      ctx.stores.keyboardModes.friends.visibleItems.set(FRIEND_IDS);
      ctx.stores.keyboardModes.friends.prefix.set('a');

      handleOpenMode(keydown('2'), ctx);

      expect(goto.mock.calls).toEqual([['/friends/friend-10']]);
    });

    it('leaves the mode when the hint points past the list', () => {
      const ctx = createContext('/friends', 'o');
      ctx.stores.keyboardModes.friends.visibleItems.set(FRIEND_IDS);
      ctx.stores.keyboardModes.friends.prefix.set('a');

      handleOpenMode(keydown('9'), ctx);

      expect([goto.mock.calls.length, ctx.clearPending.mock.calls.length]).toEqual([0, 1]);
    });
  });

  describe('on a friend detail page', () => {
    it('dispatches the index of the link instead of navigating', () => {
      const ctx = createContext('/friends/friend-1', 'o');
      ctx.stores.keyboardModes.friendLinks.visibleItems.set([
        { url: 'https://example.org', type: 'external' },
      ]);
      const listener = vi.fn();
      window.addEventListener('shortcut:open-friend-link', listener);

      handleOpenMode(keydown('1'), ctx);
      window.removeEventListener('shortcut:open-friend-link', listener);

      expect([listener.mock.calls[0]?.[0].detail, goto.mock.calls.length]).toEqual([
        { index: 0 },
        0,
      ]);
    });
  });

  describe('on a page without open mode', () => {
    it('clears the pending sequence', () => {
      const ctx = createContext('/profile', 'o');

      const isHandled = handleOpenMode(keydown('1'), ctx);

      expect([isHandled, ctx.clearPending.mock.calls.length]).toEqual([true, 1]);
    });
  });
});
