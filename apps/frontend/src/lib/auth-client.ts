import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/svelte';

/** An empty `baseUrl` keeps Better Auth on the page's own origin. */
export function createAppAuthClient(baseUrl: string) {
  return createAuthClient({
    baseURL: baseUrl === '' ? undefined : baseUrl,
    plugins: [passkeyClient()],
  });
}

export type AuthClient = ReturnType<typeof createAppAuthClient>;
