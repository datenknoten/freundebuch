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
