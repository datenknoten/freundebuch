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

const primeKeyboardFocus = vi.fn();
vi.mock('$lib/actions/auto-focus', () => ({
  primeKeyboardFocus: () => primeKeyboardFocus(),
  autoFocus: () => ({ destroy: () => undefined }),
}));

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

    it('primes the keyboard synchronously but defers opening the circle modal', async () => {
      const dispatched: string[] = [];
      const listener = (e: Event) => dispatched.push((e as CustomEvent).type);
      window.addEventListener('shortcut:new-circle', listener);
      try {
        navigateForCreateChoice('circle');

        // Priming stays inside the gesture so iOS keeps the keyboard.
        expect(primeKeyboardFocus).toHaveBeenCalledTimes(1);
        // The modal open is deferred so the caller's menu unmounts first
        // (its teardown clears isModalOpen); it must not fire synchronously.
        expect(dispatched).toEqual([]);

        // Once pending updates flush, the circle modal opens.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(dispatched).toEqual(['shortcut:new-circle']);
        expect(goto).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('shortcut:new-circle', listener);
      }
    });
  });
});
