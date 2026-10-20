import { get, readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemAt } from '$lib/test/item-at.js';
import { cleanup, fireEvent, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import NavBar from './NavBar.svelte';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$app/stores', () => ({
  page: readable({ url: new URL('http://localhost/profile') }),
}));

const context = createTestAppContext();

function renderNavBar() {
  return renderWithContext(NavBar, { props: {}, context });
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{}')));
  vi.spyOn(context.api.auth, 'getUserWithPreferences').mockResolvedValue({
    user: { externalId: 'u-1', email: 'someone@example.org', hasCompletedOnboarding: true },
    preferences: {},
  });
  await context.stores.auth.initialize();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NavBar', () => {
  describe('search trigger', () => {
    // open() focuses the modal's input itself; the trigger must call it directly
    // inside the click so that focus still counts as part of the user's tap.
    it('opens the search store from the search button', async () => {
      const searchOpen = vi.spyOn(context.stores.search, 'open');
      renderNavBar();

      const triggers = screen.getAllByLabelText('aria.search');
      expect(triggers.length).toBeGreaterThan(0);

      await fireEvent.click(itemAt(triggers, 0));

      expect(searchOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('mobile drawer', () => {
    // The drawer covers the page, so the shortcuts behind it must stay off —
    // the same overlay count the modals use.
    it('counts the open drawer as an overlay so shortcuts stay off behind it', async () => {
      renderNavBar();
      expect(get(context.stores.overlay.isAnyOpen)).toBe(false);

      const toggle = screen.getByLabelText('aria.toggleMenu');
      await fireEvent.click(toggle);
      expect(get(context.stores.overlay.isAnyOpen)).toBe(true);

      await fireEvent.click(toggle);
      expect(get(context.stores.overlay.isAnyOpen)).toBe(false);
    });

    it('releases the overlay when the nav bar unmounts with the drawer open', async () => {
      const { unmount } = renderNavBar();

      await fireEvent.click(screen.getByLabelText('aria.toggleMenu'));
      expect(get(context.stores.overlay.isAnyOpen)).toBe(true);

      unmount();

      expect(get(context.stores.overlay.isAnyOpen)).toBe(false);
    });
  });
});
