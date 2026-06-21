import { writable } from 'svelte/store';

/**
 * Session expiry handling.
 *
 * When a previously-authenticated user's session expires server-side, the very
 * next API call comes back as a 401. Rather than letting individual pages break
 * (or silently swallow the error), the API client funnels that 401 here so the
 * app can surface a re-login dialog *in place* — preserving whatever the user
 * was doing instead of bouncing them out to the login page.
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

/**
 * Notify that an API request was rejected as unauthorized (401).
 *
 * Only triggers the re-login prompt if the user actually had a session; a 401
 * while unauthenticated (e.g. the startup session probe) is ignored.
 */
export function notifyUnauthorized(): void {
  if (hasSession) {
    sessionExpired.set(true);
  }
}

/** Dismiss the session-expired prompt (e.g. after a successful re-login). */
export function clearSessionExpired(): void {
  sessionExpired.set(false);
}
