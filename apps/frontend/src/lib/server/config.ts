import { parseEnv } from '@datenknoten/kit/schema';
import { type } from 'arktype';
import { env as privateEnv } from '$env/dynamic/private';

export const ServerConfigSchema = type({
  'SENTRY_DSN?': 'string > 0',
  API_URL: 'string = "http://localhost:8787"',
  NODE_ENV: '"development"|"production"|"test" = "development"',
  '+': 'delete',
});

export type ServerConfig = typeof ServerConfigSchema.infer;

/** Throws ConfigurationError that lists every invalid variable. */
export function loadServerConfig(env: Record<string, string | undefined> = privateEnv) {
  const config: ServerConfig = parseEnv(ServerConfigSchema, env);
  return config;
}
