/**
 * Test-environment isolation.
 *
 * Vitest inherits the shell's environment, so a developer who has sourced
 * `.env` (or exported the variables any other way) runs a different suite than
 * CI does. Tests build their config from TEST_ENV and never from the process
 * environment, but two readers remain: instrumentation.ts (SENTRY_DSN, ENV),
 * which sentry-scrub.test.ts imports, and Better Auth, which reads some
 * BETTER_AUTH_* variables itself.
 *
 * Clearing the config surface here gives every test file the same empty
 * baseline. Keep CONFIG_ENV_KEYS in sync with ConfigSchema in src/config.ts.
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
  'TRUSTED_PROXY_HOPS',
  // Authentication
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'WEBAUTHN_RP_ID',
  // Email
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'SMTP_SECURE',
  // Sign-up gate
  'DISABLE_SIGNUP',
  // Optional
  'LOG_LEVEL',
  'SENTRY_DSN',
  'RATE_LIMIT_ENABLED',
  'UPLOAD_DIR',
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
