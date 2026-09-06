import { readable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Instance capabilities, read from the backend readiness probe.
 *
 * Only one thing is consumed today: whether registration is open. A private
 * instance sets `DISABLE_SIGNUP=true`, which makes `POST /api/auth/sign-up/email`
 * return 403 — the frontend hides the register link so nobody is sent to a form
 * that cannot succeed.
 *
 * The probe runs at most once per page session (the promise is memoised at
 * module level and shared by every subscriber) and never on the server, so this
 * does not add a request to SSR or to each navigation. It fails open: if the
 * probe cannot be read, the link stays visible and the backend remains the
 * authority.
 */
interface ReadinessPayload {
  signupEnabled?: unknown;
}

let probe: Promise<boolean> | null = null;

function probeSignupEnabled(): Promise<boolean> {
  probe ??= fetch('/health/ready', { credentials: 'omit' })
    .then((response) => response.json())
    .then((body: ReadinessPayload) =>
      typeof body.signupEnabled === 'boolean' ? body.signupEnabled : true,
    )
    .catch(() => true);
  return probe;
}

export const signupEnabled = readable(true, (set) => {
  if (!browser) return;
  void probeSignupEnabled().then(set);
});
