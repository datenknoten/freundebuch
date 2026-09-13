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

const primeKeyboardFocus = vi.fn();
vi.mock('$lib/actions/auto-focus', () => ({
  primeKeyboardFocus: () => primeKeyboardFocus(),
  autoFocus: () => ({ destroy: () => undefined }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NavBar search trigger', () => {
  // The modal input only mounts after the tap handler has unwound, so iOS opens
  // the on-screen keyboard only if the gesture itself claims focus first.
  it('primes the keyboard before opening the search modal', async () => {
    render(NavBar);

    const triggers = screen.getAllByLabelText('Search');
    expect(triggers.length).toBeGreaterThan(0);

    await fireEvent.click(triggers[0]);

    expect(primeKeyboardFocus).toHaveBeenCalledTimes(1);
    expect(searchOpen).toHaveBeenCalledTimes(1);
    expect(primeKeyboardFocus.mock.invocationCallOrder[0]).toBeLessThan(
      searchOpen.mock.invocationCallOrder[0],
    );
  });
});
