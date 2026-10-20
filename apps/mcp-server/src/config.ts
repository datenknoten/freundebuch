import path from 'node:path';
import { type } from 'arktype';

const BooleanString = type('"true" | "false" | "TRUE" | "FALSE" | "1" | "0"').pipe(
  (value) => value === 'true' || value === 'TRUE' || value === '1',
);

const ConfigSchema = type({
  DATABASE_URL: 'string',
  DATABASE_POOL_MIN: 'string.integer.parse = "1"',
  DATABASE_POOL_MAX: 'string.integer.parse = "5"',
  DATABASE_CONNECTION_TIMEOUT_MS: 'string.integer.parse = "5000"',
  DATABASE_IDLE_TIMEOUT_MS: 'string.integer.parse = "30000"',
  DATABASE_STATEMENT_TIMEOUT_MS: 'string.integer.parse = "30000"',
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
  BETTER_AUTH_SECRET: 'string >= 32',
  // Public origin of this deployment (e.g. https://freundebuch.example.com),
  // used to build the RFC 9728 `resource_metadata` URL in the 401 Bearer
  // challenge. Optional: when unset, it is derived per-request from the
  // X-Forwarded-Proto / Host headers set by nginx.
  'BETTER_AUTH_URL?': 'string',
  // The remaining keys configure the co-located Better Auth instance exactly as
  // the backend configures its own (see AuthConfig in the backend's lib/auth.ts).
  FRONTEND_URL: 'string = "http://localhost:5173"',
  'WEBAUTHN_RP_ID?': 'string',
  DISABLE_SIGNUP: BooleanString.default('false'),
  RATE_LIMIT_ENABLED: BooleanString.default('true'),
  'SMTP_HOST?': 'string',
  'SMTP_PORT?': 'string.integer.parse',
  'SMTP_USER?': 'string',
  'SMTP_PASSWORD?': 'string',
  'SMTP_FROM?': 'string',
  SMTP_SECURE: BooleanString.default('false'),
  // The backend's FriendsService needs a PhotoService; same defaults as the backend.
  BACKEND_URL: 'string = "http://localhost:3000"',
  UPLOAD_DIR: type('string').default(() => path.join(process.cwd(), 'uploads', 'friends')),
  '+': 'delete',
});

export type Config = typeof ConfigSchema.infer;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  // An empty value (compose's `${VAR:-}`) means unset, so the default applies.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''),
  );
  const result = ConfigSchema(env);

  if (result instanceof type.errors) {
    throw new Error(`MCP Server configuration validation failed:\n${result.summary}`);
  }

  cachedConfig = result;
  return result;
}
