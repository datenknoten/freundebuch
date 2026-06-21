import { writable } from 'svelte/store';

/**
 * Session expiry handling.
 *
 * When a previously-authenticated user's session expires server-side, the very
 * next API call comes back as a 401. Rather than letting individual pages break
 * (or silently swallow the error), the API client funnels that 401 here so the
 * app can surface a re-login dialog *in place* — preserving whatever the user
 * was doing instead of bouncing them out to the login page.
 *
 * The client also *awaits* the outcome: if the user re-authenticates, the
 * original request is replayed transparently; if they log out (or give up), the
 * request rejects as usual.
 */

// Lightweight snapshot of whether the user currently holds an authenticated
// session. Maintained by the auth store; read by the API client. We keep this
// as a module-level flag (rather than importing the auth store into the client)
// to avoid a circular import: auth store -> api -> client.
//
// It lets us distinguish an *expired* session (was authenticated, now 401 ->
// prompt re-login) from an ordinary unauthenticated state (e.g. the initial
// session check on the login page, where a 401 is expected and harmless).
let hasSession = false;

/** Called by the auth store whenever the authenticated state changes. */
export function setHasSession(value: boolean): void {
  hasSession = value;
}

/**
 * True when a previously-authenticated session has expired and we want to
 * prompt the user to re-authenticate without navigating away from the current
 * page.
 */
export const sessionExpired = writable(false);

// Requests that hit a 401 park here, each waiting to learn whether the user
// re-authenticated (true -> replay the request) or bailed out (false -> reject).
let waiters: Array<(reAuthenticated: boolean) => void> = [];

function settle(reAuthenticated: boolean): void {
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) {
    resolve(reAuthenticated);
  }
}

/**
 * Notify that an API request was rejected as unauthorized (401).
 *
 * Resolves with `true` once the user re-authenticates (caller should replay the
 * request) or `false` if they log out / abandon the prompt (caller should
 * reject). A 401 while unauthenticated (e.g. the startup session probe) resolves
 * immediately to `false` and never shows the prompt.
 */
export function notifyUnauthorized(): Promise<boolean> {
  if (!hasSession) {
    return Promise.resolve(false);
  }
  sessionExpired.set(true);
  return new Promise<boolean>((resolve) => {
    waiters.push(resolve);
  });
}

/**
 * Re-authentication succeeded: dismiss the prompt and let parked requests
 * replay.
 */
export function resolveSessionExpired(): void {
  sessionExpired.set(false);
  settle(true);
}

/**
 * The user abandoned re-authentication (e.g. logged out): dismiss the prompt and
 * let parked requests reject.
 */
export function abandonSessionExpired(): void {
  sessionExpired.set(false);
  settle(false);
}
