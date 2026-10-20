/** Signs the session cookies the integration helpers mint; the app must run with the same secret. */
export const TEST_AUTH_SECRET = 'test-better-auth-secret-test-better-auth-secret-1';

/**
 * The environment every test config starts from: `loadConfig({ ...TEST_ENV, KEY: 'value' })`.
 * Rate limiting is off because suites fire requests in bursts; the rate-limit
 * tests switch it back on.
 */
export const TEST_ENV = {
  DATABASE_URL: 'postgresql://localhost:5432/test',
  BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
  LOG_LEVEL: 'silent',
  RATE_LIMIT_ENABLED: 'false',
} as const;
