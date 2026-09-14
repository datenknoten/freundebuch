import { readable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { search } from '$lib/stores/search';
import { registerOpenOverlay, resetOpenOverlays } from '$lib/stores/ui';
import { handleGuards } from './guards';

// The guards only read authentication; a constant store keeps the test focused
// on the key handling.
vi.mock('$lib/stores/auth', () => ({ isAuthenticated: readable(true) }));

const callbacks = { toggleHelp: vi.fn(), clearPending: vi.fn(), showHelp: false };

function commandK(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true });
  // handleGuards reads e.target; an undispatched event has none.
  Object.defineProperty(event, 'target', { value: document.body });
  return event;
}

afterEach(() => {
  resetOpenOverlays();
  vi.restoreAllMocks();
});

describe('handleGuards', () => {
  it('opens the global search on Cmd+K', () => {
    const toggle = vi.spyOn(search, 'toggle').mockImplementation(() => undefined);

    const event = commandK();
    const result = handleGuards(event, callbacks);

    expect(toggle).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(result).toEqual({ suppress: true });
  });

  // The search panel is a plain fixed element; a top-layer dialog covers it, so
  // opening it behind a modal produced an unreachable panel that also kept
  // every other shortcut suppressed. The chord is still swallowed, or the
  // browser's own Cmd+K takes focus to the URL bar.
  it('swallows Cmd+K without opening the search while a modal is open', () => {
    const toggle = vi.spyOn(search, 'toggle').mockImplementation(() => undefined);
    const release = registerOpenOverlay();

    const event = commandK();
    const result = handleGuards(event, callbacks);

    expect(toggle).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(result).toEqual({ suppress: true });

    release();
  });
});
