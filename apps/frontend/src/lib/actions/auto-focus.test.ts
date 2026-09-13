import { afterEach, describe, expect, it, vi } from 'vitest';

// Spy on flushSync (keeping the real implementation) to assert that
// openWithKeyboard flushes synchronously, after applying the state change.
const flushSync = vi.hoisted(() => vi.fn());
vi.mock('svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('svelte')>();
  flushSync.mockImplementation(actual.flushSync);
  return { ...actual, flushSync: (...args: unknown[]) => flushSync(...args) };
});

import { autoFocus, openWithKeyboard } from './auto-focus';

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('autoFocus', () => {
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

describe('openWithKeyboard', () => {
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
