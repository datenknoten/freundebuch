import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstanceStore } from './instance.js';

vi.mock('$app/environment', () => ({ browser: true }));

const fetchMock = vi.fn<typeof fetch>();

const READINESS = {
  status: 'ready',
  checks: { db: true, authDb: true, uploads: true },
  signupEnabled: false,
  emailEnabled: true,
};

function createStore() {
  return new InstanceStore({ logger: createRootLogger({ LOG_LEVEL: 'silent' }) });
}

/** Subscribes until the probe settled and returns the published value. */
async function settledSignupEnabled(store: InstanceStore) {
  const unsubscribe = store.signupEnabled.subscribe(() => undefined);
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 0));
  const isEnabled = get(store.signupEnabled);
  unsubscribe();
  return isEnabled;
}

describe('InstanceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('signupEnabled', () => {
    it('publishes the flag of the readiness probe, also from a 503', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ ...READINESS, status: 'not_ready' }), { status: 503 }),
      );

      await expect(settledSignupEnabled(createStore())).resolves.toBe(false);
    });

    it('stays open when the probe answers a malformed body', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ signupEnabled: 'no' })));

      await expect(settledSignupEnabled(createStore())).resolves.toBe(true);
    });

    it('probes once for every subscriber of the page', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(READINESS)));
      const store = createStore();
      await settledSignupEnabled(store);

      await expect(settledSignupEnabled(store)).resolves.toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
