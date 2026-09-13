import { readable, writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '$lib/test';
import NavBar from './nav-bar.svelte';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/index.js', () => ({
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

vi.mock('$lib/stores/auth', () => ({
  auth: { logout: vi.fn() },
  isAuthenticated: readable(true),
  currentUser: readable({ externalId: 'u-1', email: 'someone@example.org' }),
}));

vi.mock('$lib/stores/instance', () => ({ signupEnabled: readable(true) }));

const searchOpen = vi.fn();
vi.mock('$lib/stores/search', () => ({
  search: { open: () => searchOpen(), close: vi.fn(), subscribe: writable({}).subscribe },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NavBar search trigger', () => {
  // open() focuses the modal's input itself; the trigger must call it directly
  // inside the click so that focus still counts as part of the user's tap.
  it('opens the search store from the search button', async () => {
    render(NavBar);

    const triggers = screen.getAllByLabelText('Search');
    expect(triggers.length).toBeGreaterThan(0);

    await fireEvent.click(triggers[0]);

    expect(searchOpen).toHaveBeenCalledTimes(1);
  });
});
