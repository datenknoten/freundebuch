import { readable } from 'svelte/store';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { aFriend } from '$lib/test/fixtures.js';
import { useLanguage } from '$lib/test/locale.js';
import { screen, tick, waitFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
// biome-ignore lint/correctness/useImportExtensions: routes have no alias, and the fix would rewrite the component import to `.js`
import FriendEditPage from './+page.svelte';

vi.mock('$app/stores', () => ({
  page: readable({ params: { id: 'f1' }, url: new URL('http://localhost/friends/f1/edit') }),
}));

function never<T>() {
  return new Promise<T>(() => undefined);
}

async function createInitializedContext() {
  const context = createTestAppContext();
  // A failed session check still finishes the auth initialisation, which the page waits for.
  vi.spyOn(context.api.auth, 'getUserWithPreferences').mockRejectedValue(new Error('401'));
  await context.stores.auth.initialize();
  return context;
}

describe('FriendEditPage', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('with the friend loaded', () => {
    it('keeps the form mounted while a store action runs on the friend', async () => {
      const context = await createInitializedContext();
      vi.spyOn(context.api.friends, 'getFriend').mockResolvedValue(
        aFriend({ id: 'f1', displayName: 'Ada' }),
      );
      renderWithContext(FriendEditPage, { props: {}, context });
      const field = await screen.findByLabelText(/Display Name/);

      // A photo delete — or any store action — flips isLoading for the whole store.
      vi.spyOn(context.api.friendPhotos, 'deletePhoto').mockReturnValue(never());
      void context.stores.friends.deletePhoto('f1');
      await tick();

      expect(screen.getByLabelText(/Display Name/)).toBe(field);
    });
  });

  describe('while the friend is still loading', () => {
    it('shows a spinner instead of the form', async () => {
      const context = await createInitializedContext();
      vi.spyOn(context.api.friends, 'getFriend').mockReturnValue(never());

      renderWithContext(FriendEditPage, { props: {}, context });

      await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
      expect(screen.queryByLabelText(/Display Name/)).toBeNull();
    });
  });
});
