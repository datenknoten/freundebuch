/**
 * Shared timeouts for integration test suites.
 *
 * A single PostGIS container is started once per run by global-setup; suite
 * hooks only clone a database from its migrated template and boot the app, so
 * they no longer need to budget for a container start. The suite budget stays
 * larger than the container budget because the first suite to run may still be
 * waiting on that one-time start.
 */

/** Maximum time for the PostgreSQL/PostGIS container itself to become healthy. */
export const CONTAINER_STARTUP_TIMEOUT_MS = 60_000;

/**
 * Timeout for beforeAll/afterAll suite hooks: template clone, app boot, and
 * teardown, plus headroom for the one-time container start.
 */
export const SUITE_HOOK_TIMEOUT_MS = 120_000;
