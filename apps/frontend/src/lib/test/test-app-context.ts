import type { AppApis, AppContext, AppStores } from '$lib/app-context.js';
import type { ClientConfig } from '$lib/config.js';
import { createAppContext } from '$lib/create-app-context.js';

export interface TestAppContextOverrides {
  api?: Partial<AppApis>;
  stores?: Partial<AppStores>;
}

export const TEST_CLIENT_CONFIG: ClientConfig = {
  PUBLIC_API_URL: '',
  PUBLIC_LOG_LEVEL: 'silent',
};

/**
 * The real AppContext on a silent logger, with the given APIs and stores in place of the real
 * ones. A member that a test does not override still talks to the global `fetch`.
 */
export function createTestAppContext(overrides: TestAppContextOverrides = {}) {
  const context = createAppContext(TEST_CLIENT_CONFIG);
  return {
    ...context,
    api: { ...context.api, ...overrides.api },
    stores: { ...context.stores, ...overrides.stores },
  } satisfies AppContext;
}
