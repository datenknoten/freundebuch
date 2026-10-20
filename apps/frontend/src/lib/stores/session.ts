import { type Readable, writable } from 'svelte/store';

type ReAuthenticationWaiter = (isReAuthenticated: boolean) => void;

/**
 * Session expiry handling.
 *
 * When a previously authenticated user's session expires server-side, the next API call answers
 * 401. The API client hands that 401 to `notifyUnauthorized`, which raises the re-login prompt in
 * place, so the user keeps whatever they were doing, and parks the request until the outcome is
 * known: a re-authentication replays it, a sign-out rejects it.
 *
 * The store's value is whether the prompt is shown.
 */
export class SessionStore {
  public readonly subscribe: Readable<boolean>['subscribe'];
  private readonly isExpired = writable(false);
  // Tells an expired session (prompt for re-login) from an ordinary signed-out state, such as the
  // startup session probe, where a 401 is expected.
  private hasSession = false;
  private waiters: ReAuthenticationWaiter[] = [];

  public constructor() {
    this.subscribe = this.isExpired.subscribe;
  }

  /** The auth store reports every change of the signed-in state here. */
  public setHasSession(hasSession: boolean) {
    this.hasSession = hasSession;
  }

  /**
   * Resolves `true` once the user signed in again, so the caller replays the request, and
   * `false` once they signed out or when no session existed in the first place.
   */
  public notifyUnauthorized() {
    if (this.hasSession === false) {
      return Promise.resolve(false);
    }
    this.isExpired.set(true);
    return new Promise<boolean>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  /** The user signed in again: hides the prompt and replays the parked requests. */
  public resolveSessionExpired() {
    this.isExpired.set(false);
    this.settle(true);
  }

  /** The user gave up, for example by signing out: hides the prompt and rejects parked requests. */
  public abandonSessionExpired() {
    this.isExpired.set(false);
    this.settle(false);
  }

  private settle(isReAuthenticated: boolean) {
    const pending = this.waiters;
    this.waiters = [];
    for (const resolve of pending) {
      resolve(isReAuthenticated);
    }
  }
}
