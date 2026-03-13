import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/svelte';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL || undefined,
  plugins: [passkeyClient()],
});
