import { readable } from 'svelte/store';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, tick, useLanguage } from '$lib/test';
import EditPage from './+page.svelte';

// Hoisted above the mock factory so the test body and the mocked module share
// the same stores. Hand-rolled rather than `writable`, because `vi.hoisted`
// runs before this file's imports.
const stores = vi.hoisted(() => {
  function store<T>(initial: T) {
    let value = initial;
    const subscribers = new Set<(v: T) => void>();
    return {
      subscribe(run: (v: T) => void) {
        subscribers.add(run);
        run(value);
        return () => {
          subscribers.delete(run);
        };
      },
      set(next: T) {
        value = next;
        for (const run of subscribers) run(value);
      },
    };
  }
  return {
    state: store<{ isLoading: boolean; error: string | null }>({ isLoading: false, error: null }),
    friend: store<{ id: string; displayName: string } | null>({ id: 'f1', displayName: 'Ada' }),
  };
});

vi.mock('$app/stores', () => ({
  page: readable({ params: { id: 'f1' }, url: new URL('http://localhost/friends/f1/edit') }),
}));

vi.mock('$lib/stores/auth', () => ({ isAuthInitialized: readable(true) }));

vi.mock('$lib/stores/friends', () => ({
  friends: { subscribe: stores.state.subscribe, loadFriend: vi.fn().mockResolvedValue(undefined) },
  currentFriend: { subscribe: stores.friend.subscribe },
  isFriendsLoading: {
    subscribe: (run: (v: boolean) => void) =>
      stores.state.subscribe((s) => {
        run(s.isLoading);
      }),
  },
}));

describe('friend edit page', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('keeps the form mounted while a store action runs on the loaded friend', async () => {
    stores.friend.set({ id: 'f1', displayName: 'Ada' });
    stores.state.set({ isLoading: false, error: null });
    render(EditPage, {});
    const field = screen.getByLabelText(/Display Name/);

    // A photo delete — or any store action — flips isLoading for the whole store.
    stores.state.set({ isLoading: true, error: null });
    await tick();

    expect(screen.getByLabelText(/Display Name/)).toBe(field);
  });

  it('spins while the friend itself is still loading', async () => {
    stores.friend.set(null);
    stores.state.set({ isLoading: true, error: null });

    render(EditPage, {});
    await tick();

    expect(screen.queryByLabelText(/Display Name/)).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
