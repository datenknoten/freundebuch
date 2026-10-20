import type * as Svelte from 'svelte';
import { get, readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { goto } from '$app/navigation';
import FabCreateMenu, { navigateForCreateChoice } from '$lib/components/FabCreateMenu.svelte';
import { fireEvent, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/i18n.js', () => import('$lib/test/i18n-key-mock.js'));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// navigateForCreateChoice reads the current route; pretend we're on /circles so
// the "create circle in place" branch runs.
vi.mock('$app/stores', () => ({ page: readable({ url: new URL('http://localhost/circles') }) }));

// Spy on flushSync (keeping the real implementation) so the circle branch's
// two synchronous flushes can be ordered against the modal-open event.
const flushSync = vi.hoisted(() => vi.fn());

function spyFlushSync(...args: unknown[]) {
  return flushSync(...args);
}

async function mockSvelte(importOriginal: <T>() => Promise<T>) {
  const actual = await importOriginal<typeof Svelte>();
  flushSync.mockImplementation(actual.flushSync);
  return { ...actual, flushSync: spyFlushSync };
}

vi.mock('svelte', mockSvelte);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FabCreateMenu', () => {
  describe('when open', () => {
    it('offers the four create options and reports the selected choice', async () => {
      const onSelect = vi.fn();
      renderWithContext(FabCreateMenu, { props: { onSelect, onClose: vi.fn() } });

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
      renderWithContext(FabCreateMenu, { props: { onSelect: vi.fn(), onClose: vi.fn() } });
      expect(screen.queryByText('friendDetail.addDetail')).toBeNull();
    });

    it('shows the contextual "add detail" entry and invokes onAddDetail', async () => {
      const onAddDetail = vi.fn();
      renderWithContext(FabCreateMenu, {
        props: { onSelect: vi.fn(), onClose: vi.fn(), onAddDetail },
      });

      await fireEvent.click(screen.getByText('friendDetail.addDetail'));
      expect(onAddDetail).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape and via the cancel button', async () => {
      const onClose = vi.fn();
      renderWithContext(FabCreateMenu, { props: { onSelect: vi.fn(), onClose } });

      // Escape reaches the sheet as the native dialog's `cancel` event.
      await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
      await fireEvent.click(screen.getByText('common.cancel'));
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('overlay registration', () => {
    it('flags the global modal state while open and clears it on unmount', () => {
      const context = createTestAppContext();
      const { unmount } = renderWithContext(FabCreateMenu, {
        props: { onSelect: vi.fn(), onClose: vi.fn() },
        context,
      });
      expect(get(context.stores.overlay.isAnyOpen)).toBe(true);

      unmount();
      expect(get(context.stores.overlay.isAnyOpen)).toBe(false);
    });
  });
});

describe('navigateForCreateChoice', () => {
  describe('for a non-circle choice', () => {
    it('routes straight to the create flow', () => {
      navigateForCreateChoice('friend');
      expect(goto).toHaveBeenCalledWith('/friends/new');
    });
  });

  describe('for the circle choice', () => {
    // The modal must open inside the FAB tap (iOS raises the keyboard only for
    // a focus() within the gesture), but only after the menu's teardown has
    // flushed: closing its <dialog> restores focus to the FAB, which would
    // otherwise land after the modal's autofocus and drop the keyboard.
    it('opens the circle modal synchronously, flushing the menu teardown first', () => {
      const flushesBeforeDispatch: number[] = [];
      function recordFlushCount() {
        flushesBeforeDispatch.push(flushSync.mock.calls.length);
      }
      window.addEventListener('shortcut:new-circle', recordFlushCount);
      try {
        navigateForCreateChoice('circle');

        // Dispatched within the call itself — no deferral out of the gesture.
        expect(flushesBeforeDispatch).toEqual([1]);
        // ...and the modal mount is flushed right after, still synchronously.
        expect(flushSync).toHaveBeenCalledTimes(2);
        expect(goto).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('shortcut:new-circle', recordFlushCount);
      }
    });
  });
});
