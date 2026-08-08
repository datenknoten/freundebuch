/**
 * Test-environment isolation.
 *
 * Vitest inherits the shell's environment, so a developer who has sourced
 * `.env` (or exported the variables any other way) runs a different suite than
 * CI does. That is not hypothetical: `tests/config.test.ts` asserts that
 * `getConfig()` *throws* when DATABASE_URL is missing, which silently cannot
 * happen if the shell supplies one. Six tests failed locally and passed in CI
 * for exactly this reason.
 *
 * Clearing the config surface here gives every test file the same empty
 * baseline. Tests opt in to the values they need with `vi.stubEnv`, and because
 * the variable is absent when the stub is recorded, `vi.unstubAllEnvs()`
 * removes it again rather than restoring a stale ambient value.
 *
 * Keep CONFIG_ENV_KEYS in sync with ConfigSchema in src/utils/config.ts. A key
 * that is in the schema but missing here is a variable the shell can still
 * leak into a test run.
 */
const CONFIG_ENV_KEYS = [
  // Database
  'DATABASE_URL',
  'DATABASE_POOL_MIN',
  'DATABASE_POOL_MAX',
  'DATABASE_CONNECTION_TIMEOUT_MS',
  'DATABASE_IDLE_TIMEOUT_MS',
  'DATABASE_STATEMENT_TIMEOUT_MS',
  // Server
  'ENV',
  'PORT',
  'FRONTEND_URL',
  'BACKEND_URL',
  'TRUST_PROXY',
  // Authentication
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'WEBAUTHN_RP_ID',
  // Email
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  // Optional
  'LOG_LEVEL',
  'ENABLE_API_DOCS',
  'SENTRY_DSN',
  // Address lookup
  'OVERPASS_API_URL',
  'OVERPASS_FALLBACK_URL',
  'ADDRESS_CACHE_TTL_HOURS',
  'NOMINATIM_CONTACT_EMAIL',
  'POSTGIS_ADDRESS_ENABLED',
  'POSTGIS_ADDRESS_DACH_ONLY',
] as const;

for (const key of CONFIG_ENV_KEYS) {
  delete process.env[key];
}

export { CONFIG_ENV_KEYS };
