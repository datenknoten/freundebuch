/**
 * Shared timeouts for integration test suites.
 *
 * The integration tests start one PostGIS testcontainer per test file. The
 * suite hooks (beforeAll/afterAll) must allow for the container startup
 * timeout PLUS migrations and app boot - if both budgets are equal, a slow
 * container start (e.g. while pre-push hooks run tests, PHP tests, and builds
 * concurrently) eats the whole hook budget and the suite flakes with
 * "Hook timed out".
 */

/** Maximum time for the PostgreSQL/PostGIS container itself to become healthy. */
export const CONTAINER_STARTUP_TIMEOUT_MS = 120_000;

/**
 * Timeout for beforeAll/afterAll suite hooks. Deliberately larger than
 * CONTAINER_STARTUP_TIMEOUT_MS to leave headroom for migrations, app boot,
 * and teardown under load.
 */
export const SUITE_HOOK_TIMEOUT_MS = 300_000;
