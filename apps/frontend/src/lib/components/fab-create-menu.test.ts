import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isModalOpen } from '$lib/stores/ui';
import { fireEvent, render, screen } from '$lib/test';
import FabCreateMenu, { navigateForCreateChoice } from './fab-create-menu.svelte';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

// navigateForCreateChoice reads the current route; pretend we're on /circles so
// the "create circle in place" branch runs.
vi.mock('$app/stores', () => ({
  page: {
    subscribe: (run: (v: { url: URL }) => void) => {
      run({ url: new URL('http://localhost/circles') });
      return () => undefined;
    },
  },
}));

// Spy on flushSync (keeping the real implementation) so the circle branch's
// two synchronous flushes can be ordered against the modal-open event.
const flushSync = vi.hoisted(() => vi.fn());
vi.mock('svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('svelte')>();
  flushSync.mockImplementation(actual.flushSync);
  return { ...actual, flushSync: (...args: unknown[]) => flushSync(...args) };
});

afterEach(() => {
  vi.clearAllMocks();
  isModalOpen.set(false);
});

describe('FabCreateMenu', () => {
  it('offers the four create options and reports the selected choice', async () => {
    const onSelect = vi.fn();
    render(FabCreateMenu, { onSelect, onClose: vi.fn() });

    for (const label of [
      'shortcuts.newFriend',
      'shortcuts.newEncounter',
      'shortcuts.newCircle',
      'shortcuts.newCollective',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }

    await fireEvent.click(screen.getByText('shortcuts.newFriend'));
    expect(onSelect).toHaveBeenCalledWith('friend');
  });

  it('omits the contextual "add detail" entry when onAddDetail is not provided', () => {
    render(FabCreateMenu, { onSelect: vi.fn(), onClose: vi.fn() });
    expect(screen.queryByText('friendDetail.addDetail')).toBeNull();
  });

  it('shows the contextual "add detail" entry and invokes onAddDetail', async () => {
    const onAddDetail = vi.fn();
    render(FabCreateMenu, { onSelect: vi.fn(), onClose: vi.fn(), onAddDetail });

    await fireEvent.click(screen.getByText('friendDetail.addDetail'));
    expect(onAddDetail).toHaveBeenCalledTimes(1);
  });

  it('flags the global modal state while open and clears it on unmount', () => {
    const { unmount } = render(FabCreateMenu, { onSelect: vi.fn(), onClose: vi.fn() });
    expect(get(isModalOpen)).toBe(true);

    unmount();
    expect(get(isModalOpen)).toBe(false);
  });

  it('closes on Escape and via the cancel button', async () => {
    const onClose = vi.fn();
    render(FabCreateMenu, { onSelect: vi.fn(), onClose });

    await fireEvent.keyDown(window, { key: 'Escape' });
    await fireEvent.click(screen.getByText('common.cancel'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  describe('navigateForCreateChoice', () => {
    it('routes non-circle choices straight to their create flow', () => {
      navigateForCreateChoice('friend');
      expect(goto).toHaveBeenCalledWith('/friends/new');
    });

    // The modal must open inside the FAB tap (iOS raises the keyboard only for
    // a focus() within the gesture), but only after the menu's teardown has
    // flushed, or its cleanup would clear isModalOpen behind the open modal.
    it('opens the circle modal synchronously, flushing the menu teardown first', () => {
      const flushesBeforeDispatch: number[] = [];
      const listener = () => flushesBeforeDispatch.push(flushSync.mock.calls.length);
      window.addEventListener('shortcut:new-circle', listener);
      try {
        navigateForCreateChoice('circle');

        // Dispatched within the call itself — no deferral out of the gesture.
        expect(flushesBeforeDispatch).toEqual([1]);
        // ...and the modal mount is flushed right after, still synchronously.
        expect(flushSync).toHaveBeenCalledTimes(2);
        expect(goto).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('shortcut:new-circle', listener);
      }
    });
  });
});
