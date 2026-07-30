import { type } from 'arktype';

const ConfigSchema = type({
  DATABASE_URL: 'string',
  DATABASE_POOL_MIN: 'string.integer.parse = "1"',
  DATABASE_POOL_MAX: 'string.integer.parse = "5"',
  MCP_PORT: 'string.integer.parse = "3100"',
  LOG_LEVEL: '"trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent" = "info"',
  // No default: deploying to production without explicitly setting ENV would
  // silently use development defaults (e.g. pino-pretty transport). Fail closed.
  ENV: '"development" | "production" | "test"',
  // Shared with the backend's Better Auth instance. The MCP server co-locates a
  // Better Auth instance (imported from @freundebuch/backend) to validate OAuth
  // bearer tokens via getMcpSession; it must use the same secret and database
  // as the authorization server so token lookups resolve. Declared here so a
  // missing secret fails fast at boot rather than on the first OAuth request.
  BETTER_AUTH_SECRET: 'string',
  // Public origin of this deployment (e.g. https://freundebuch.example.com),
  // used to build the RFC 9728 `resource_metadata` URL in the 401 Bearer
  // challenge. Optional: when unset, it is derived per-request from the
  // X-Forwarded-Proto / Host headers set by nginx.
  'BETTER_AUTH_URL?': 'string',
  '+': 'delete',
});

export type Config = typeof ConfigSchema.infer;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const result = ConfigSchema(process.env);

  if (result instanceof type.errors) {
    throw new Error(`MCP Server configuration validation failed:\n${result.summary}`);
  }

  cachedConfig = result;
  return result;
}
