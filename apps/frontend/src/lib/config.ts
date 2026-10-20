import { LOG_LEVELS } from '@datenknoten/kit/logger';
import { parseEnv } from '@datenknoten/kit/schema';
import { type } from 'arktype';
// A namespace import, because a named import of a variable that is unset at build time fails the build.
import * as publicEnv from '$env/static/public';

export const ClientConfigSchema = type({
  PUBLIC_API_URL: 'string = ""',
  'PUBLIC_SENTRY_DSN?': 'string > 0',
  PUBLIC_LOG_LEVEL: type.enumerated(...LOG_LEVELS).default('info'),
  '+': 'delete',
});

export type ClientConfig = typeof ClientConfigSchema.infer;

/** Throws ConfigurationError that lists every invalid variable. */
export function loadClientConfig(env: Record<string, string | undefined> = publicEnv) {
  const config: ClientConfig = parseEnv(ClientConfigSchema, env);
  return config;
}
