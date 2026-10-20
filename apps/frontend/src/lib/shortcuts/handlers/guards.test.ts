import { readable, writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardModesStore } from '$lib/stores/keyboard-modes.js';
import { OverlayStore } from '$lib/stores/overlay.js';
import type { ShortcutStores } from '../types.js';
import { handleGuards } from './guards.js';

function createStores() {
  const search = { isOpen: writable(false), toggle: vi.fn() };
  const stores: ShortcutStores = {
    keyboardModes: new KeyboardModesStore(),
    overlay: new OverlayStore(),
    isAuthenticated: readable(true),
    search,
    currentFriend: readable(null),
    friendListFilter: readable({ query: '', filters: {} }),
  };
  return { stores, search };
}

function createOptions(stores: ShortcutStores) {
  return { toggleHelp: vi.fn(), clearPending: vi.fn(), isHelpOpen: false, stores };
}

function commandK() {
  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true });
  // handleGuards reads e.target; an undispatched event has none.
  Object.defineProperty(event, 'target', { value: document.body });
  return event;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleGuards', () => {
  describe('Cmd+K', () => {
    it('opens the global search', () => {
      const { stores, search } = createStores();
      const event = commandK();

      const result = handleGuards(event, createOptions(stores));

      expect([search.toggle.mock.calls.length, event.defaultPrevented, result]).toEqual([
        1,
        true,
        { suppress: true },
      ]);
    });

    // The search panel is a plain fixed element; a top-layer dialog covers it, so
    // opening it behind a modal produced an unreachable panel that also kept
    // every other shortcut suppressed. The chord is still swallowed, or the
    // browser's own Cmd+K takes focus to the URL bar.
    it('swallows the chord without opening the search while a modal is open', () => {
      const { stores, search } = createStores();
      stores.overlay.register();
      const event = commandK();

      const result = handleGuards(event, createOptions(stores));

      expect([search.toggle.mock.calls.length, event.defaultPrevented, result]).toEqual([
        0,
        true,
        { suppress: true },
      ]);
    });
  });
});
