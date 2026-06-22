/**
 * Helpers for stubbing the global `fetch` in unit tests. Generalizes the
 * `response401()` / `vi.stubGlobal('fetch', ...)` pattern that was previously
 * copy-pasted into individual API tests (see api/client.test.ts).
 *
 * Typical usage:
 *
 *   import { stubFetch, jsonResponse, restoreFetch } from '$lib/test';
 *
 *   afterEach(restoreFetch);
 *
 *   it('returns the friend', async () => {
 *     stubFetch(jsonResponse(aFriend()));
 *     ...
 *   });
 */
import { vi } from 'vitest';

interface ResponseInit {
  /** Defaults to `status` being in the 2xx range. */
  ok?: boolean;
  /** HTTP status code. Defaults to 200. */
  status?: number;
}

/** A minimal `Response`-like object whose `.json()` resolves to `body`. */
export function jsonResponse<T>(body: T, init: ResponseInit = {}): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

/** A non-OK response whose `.json()` rejects, simulating a non-JSON body. */
export function nonJsonResponse(status = 500): Response {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
  } as unknown as Response;
}

/** A 401 Unauthorized response with a JSON error body. */
export function unauthorizedResponse(): Response {
  return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Replace the global `fetch` with a `vi.fn()` resolving to `response`
 * (default: an empty 200 JSON body). Returns the mock so callers can refine
 * behavior (`mockResolvedValueOnce`, etc.) and assert on calls. Pair with
 * `restoreFetch()` in `afterEach`.
 */
export function stubFetch(response?: Response) {
  const mock = vi.fn().mockResolvedValue(response ?? jsonResponse({}));
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Restore globals and mocks stubbed during a test. */
export function restoreFetch(): void {
  vi.restoreAllMocks();
}
