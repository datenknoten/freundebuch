import type * as Svelte from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Spy on flushSync (keeping the real implementation) to assert that
// openWithKeyboard flushes synchronously, after applying the state change.
const flushSync = vi.hoisted(() => vi.fn());
vi.mock('svelte', mockSvelte);

async function mockSvelte(importOriginal: () => Promise<typeof Svelte>) {
  const actual = await importOriginal();
  flushSync.mockImplementation(actual.flushSync);
  function spiedFlushSync(...args: unknown[]) {
    return flushSync(...args);
  }
  return { ...actual, flushSync: spiedFlushSync };
}

import { autoFocus, openWithKeyboard } from './auto-focus.js';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('autoFocus', () => {
  describe('on mount', () => {
    // Synchronous focus is what claims the mobile keyboard when the mount runs
    // inside a tap; deferring it a frame would land outside the gesture.
    it('focuses the element synchronously on mount', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      autoFocus(input);

      expect(document.activeElement).toBe(input);
    });

    it('is a no-op when disabled', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      expect(autoFocus(input, false)).toBeUndefined();

      expect(document.activeElement).not.toBe(input);
    });
  });

  describe('a frame after mount', () => {
    it('re-focuses a frame later if something else took focus meanwhile', async () => {
      const input = document.createElement('input');
      const other = document.createElement('input');
      document.body.append(input, other);

      autoFocus(input);
      other.focus();
      expect(document.activeElement).toBe(other);

      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(document.activeElement).toBe(input);
    });

    it('cancels the deferred retry on destroy', async () => {
      const input = document.createElement('input');
      const other = document.createElement('input');
      document.body.append(input, other);

      const action = autoFocus(input);
      other.focus();
      action?.destroy();

      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(document.activeElement).toBe(other);
    });
  });
});

describe('openWithKeyboard', () => {
  describe('inside a gesture', () => {
    it('applies the state change, then flushes synchronously within the same call', () => {
      const flushesWhenOpening: number[] = [];
      const open = vi.fn(() => flushesWhenOpening.push(flushSync.mock.calls.length));

      openWithKeyboard(open);

      expect(open).toHaveBeenCalledTimes(1);
      // The flush comes after `open`, never before it.
      expect(flushesWhenOpening).toEqual([0]);
      expect(flushSync).toHaveBeenCalledTimes(1);
    });
  });
});
