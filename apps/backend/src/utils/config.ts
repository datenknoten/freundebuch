import { type } from 'arktype';

const BooleanString = type('"true" | "false" | "TRUE" | "FALSE" | "1" | "0" | boolean').pipe(
  (result) => result === 'true' || result === '1' || result === 'TRUE' || result === true,
);

const SecretType = type('string >= 32').and(/^(?!.*(?:change-this|your-secret|REPLACE)).*$/);

/**
 * ArkType schema for environment configuration validation
 */
const ConfigSchema = type({
  // Database
  DATABASE_URL: 'string',
  DATABASE_POOL_MIN: 'string.integer.parse = "2"',
  DATABASE_POOL_MAX: 'string.integer.parse = "10"',

  // Server
  ENV: '"development" | "production" | "test" = "development"',
  PORT: 'string.integer.parse = "3000"',
  FRONTEND_URL: 'string = "http://localhost:5173"',
  BACKEND_URL: 'string = "http://localhost:3000"',

  // Authentication
  JWT_SECRET: SecretType,
  // TODO convert that later to a smart string like 7d
  // Default expiry of 7 days
  JWT_EXPIRY: 'string.integer.parse = "604800"',
  SESSION_SECRET: SecretType,
  SESSION_EXPIRY_DAYS: 'string.integer.parse = "7"',
  PASSWORD_RESET_EXPIRY_HOURS: 'string.integer.parse = "1"',

  // Email (optional, for later phases)
  'SMTP_HOST?': 'string',
  'SMTP_PORT?': 'string.integer.parse',
  'SMTP_USER?': 'string',
  'SMTP_PASSWORD?': 'string',

  // Optional
  LOG_LEVEL: '"trace" | "debug" | "info" | "warn" | "error" | "fatal" = "info"',
  ENABLE_API_DOCS: BooleanString.default(false),

  // Sentry (optional)
  'SENTRY_DSN?': 'string',

  // Address Lookup APIs
  'ZIPCODEBASE_API_KEY?': 'string',
  OVERPASS_API_URL: 'string = "https://overpass-api.de/api/interpreter"',
  OVERPASS_FALLBACK_URL: 'string = "https://overpass.kumi.systems/api/interpreter"',
  ADDRESS_CACHE_TTL_HOURS: 'string.integer.parse = "24"',
  '+': 'delete',
});

export type Config = typeof ConfigSchema.infer;

let cachedConfig: Config | null = null;

/**
 * Parses and validates environment variables into a typed configuration object
 * @throws {Error} If validation fails with detailed error messages
 * @returns Validated configuration object
 */
export function getConfig(): Config {
  if (typeof cachedConfig === 'object' && cachedConfig !== null) {
    return cachedConfig;
  }

  const result = ConfigSchema(process.env);

  if (result instanceof type.errors) {
    const errorMessage = result.summary;
    throw new Error(`Configuration validation failed:\n${errorMessage}`);
  }

  cachedConfig = result;
  return result;
}

/**
 * Resets the cached configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}
