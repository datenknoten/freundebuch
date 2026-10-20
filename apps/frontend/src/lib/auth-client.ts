import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/svelte';

function buildAuthClient(baseUrl: string) {
  return createAuthClient({
    baseURL: baseUrl === '' ? undefined : baseUrl,
    plugins: [passkeyClient()],
  });
}

/**
 * Starts on the same origin; `configureAuthClient` rebinds it. Importers read the live binding,
 * so they see the configured client.
 */
export let authClient = buildAuthClient('');

/** The root layout load calls this once with the client config, before the first request. */
export function configureAuthClient(baseUrl: string) {
  authClient = buildAuthClient(baseUrl);
}
