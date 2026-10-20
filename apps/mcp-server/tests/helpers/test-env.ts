/**
 * The environment every test config starts from: `loadConfig({ ...TEST_ENV, KEY: 'value' })`.
 * Rate limiting is off because suites fire requests in bursts.
 */
export const TEST_ENV = {
  DATABASE_URL: 'postgresql://localhost:5432/test',
  BETTER_AUTH_SECRET: 'test-better-auth-secret-test-better-auth-secret-1',
  ENV: 'test',
  LOG_LEVEL: 'silent',
  RATE_LIMIT_ENABLED: 'false',
  UPLOAD_DIR: '/tmp/mcp-test-uploads',
} as const;
