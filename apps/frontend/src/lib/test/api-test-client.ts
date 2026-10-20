import { createRootLogger } from '@datenknoten/kit/logger';
import { ApiClient } from '$lib/api/api-client.js';

async function stayUnauthenticated() {
  return false;
}

/** A real ApiClient on a silent logger that never replays a 401; stub the global `fetch` to drive it. */
export function createTestApiClient() {
  return new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
}
