import { get } from 'svelte/store';
import { afterEach, describe, expect, it } from 'vitest';
import {
  abandonSessionExpired,
  notifyUnauthorized,
  resolveSessionExpired,
  sessionExpired,
  setHasSession,
} from './session.js';

describe('session store', () => {
  afterEach(() => {
    // Release anything parked and reset module state between tests.
    abandonSessionExpired();
    setHasSession(false);
  });

  it('resolves immediately to false and does not prompt when unauthenticated', async () => {
    setHasSession(false);

    await expect(notifyUnauthorized()).resolves.toBe(false);
    expect(get(sessionExpired)).toBe(false);
  });

  it('shows the prompt and parks the request when authenticated', () => {
    setHasSession(true);

    const pending = notifyUnauthorized();

    expect(get(sessionExpired)).toBe(true);
    // The promise stays pending until resolved/abandoned.
    void pending;
  });

  it('resolveSessionExpired settles parked requests with true and hides the prompt', async () => {
    setHasSession(true);
    const pending = notifyUnauthorized();

    resolveSessionExpired();

    await expect(pending).resolves.toBe(true);
    expect(get(sessionExpired)).toBe(false);
  });

  it('abandonSessionExpired settles parked requests with false and hides the prompt', async () => {
    setHasSession(true);
    const pending = notifyUnauthorized();

    abandonSessionExpired();

    await expect(pending).resolves.toBe(false);
    expect(get(sessionExpired)).toBe(false);
  });

  it('settles every parked request from a single resolution', async () => {
    setHasSession(true);
    const first = notifyUnauthorized();
    const second = notifyUnauthorized();

    resolveSessionExpired();

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });
});
