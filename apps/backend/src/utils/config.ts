import { type } from 'arktype';
import { ConfigurationError } from './errors.js';

const BooleanString = type('"true" | "false" | "TRUE" | "FALSE" | "1" | "0" | boolean').pipe(
  (result) => result === 'true' || result === '1' || result === 'TRUE' || result === true,
);

const SecretType = type('string >= 32').and(/^(?!.*(?:change-this|your-secret|REPLACE)).*$/);

// Validate the connection string shape at boot rather than failing on first
// connect with an opaque error.
const DatabaseUrlType = type('string').and(/^postgres(?:ql)?:\/\//);

/**
 * ArkType schema for environment configuration validation
 */
const ConfigSchema = type({
  // Database
  DATABASE_URL: DatabaseUrlType,
  DATABASE_POOL_MIN: 'string.integer.parse = "2"',
  DATABASE_POOL_MAX: 'string.integer.parse = "10"',
  DATABASE_CONNECTION_TIMEOUT_MS: 'string.integer.parse = "5000"',
  DATABASE_IDLE_TIMEOUT_MS: 'string.integer.parse = "30000"',
  DATABASE_STATEMENT_TIMEOUT_MS: 'string.integer.parse = "30000"',

  // Server
  //
  // ENV describes the deployment: log format, Sentry environment and sample
  // rate, and whether the dev-only guards in lib/auth.ts (which would
  // otherwise write reset links to the log) are open.
  //
  // It is deliberately NOT NODE_ENV, and neither replaces the other. NODE_ENV
  // is Node's and the ecosystem's own switch: package managers prune
  // devDependencies on it, and libraries branch on it for dev-only warnings
  // and slow paths. A deployment sets both, and dropping either changes
  // behaviour somewhere unrelated to the other.
  ENV: '"development" | "production" | "test" = "development"',
  PORT: 'string.integer.parse = "3000"',
  FRONTEND_URL: 'string = "http://localhost:5173"',
  BACKEND_URL: 'string = "http://localhost:3000"',
  // Set true only when the app runs behind a reverse proxy that appends the
  // real client IP to X-Forwarded-For. When false, rate limiting keys off the
  // socket peer address, which clients cannot spoof.
  TRUST_PROXY: BooleanString.default(false),
  // How many proxies sit in front of the app, counted from the app outwards.
  //
  // Each one appends its own peer to X-Forwarded-For, so the client address is
  // that many entries from the right - not simply the last one. With nginx
  // alone the header is "client" and 1 is correct; with Traefik in front of
  // nginx it is "client, traefik" and 1 would key every anonymous request to
  // the shared Traefik address, which is the collapse TRUST_PROXY exists to
  // avoid. Only consulted when TRUST_PROXY is set.
  TRUSTED_PROXY_HOPS: type('string.integer.parse').to('number >= 1').default('1'),

  // Authentication (Better Auth)
  BETTER_AUTH_SECRET: SecretType,
  // Public origin of the deployment (e.g. https://freundebuch.example.com).
  // Better Auth reads process.env.BETTER_AUTH_URL directly for its issuer/base
  // URL; we also declare it here so the OAuth `resource` audience and discovery
  // metadata can be derived from config. Optional: when unset, Better Auth
  // resolves the base URL per-request (preserving the existing dev behaviour)
  // and we fall back to FRONTEND_URL for the resource value.
  'BETTER_AUTH_URL?': 'string',

  // WebAuthn / Passkey
  'WEBAUTHN_RP_ID?': 'string',

  // Email. Without SMTP_HOST the mailer is disabled and password-reset /
  // verification mails are logged instead of sent (see services/mailer.ts).
  'SMTP_HOST?': 'string',
  'SMTP_PORT?': 'string.integer.parse',
  'SMTP_USER?': 'string',
  'SMTP_PASSWORD?': 'string',
  // Envelope sender. Defaults to no-reply@<FRONTEND_URL host> when unset.
  'SMTP_FROM?': 'string',
  // true for implicit TLS (port 465); false uses STARTTLS (587/25).
  SMTP_SECURE: BooleanString.default(false),

  // Close registration on a private instance. The sign-up endpoint then
  // returns 403 and the frontend hides the register link.
  DISABLE_SIGNUP: BooleanString.default(false),

  // Optional
  LOG_LEVEL: '"trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent" = "info"',

  // Sentry (optional)
  'SENTRY_DSN?': 'string',

  // Address Lookup APIs
  OVERPASS_API_URL: 'string = "https://overpass-api.de/api/interpreter"',
  OVERPASS_FALLBACK_URL: 'string = "https://overpass.kumi.systems/api/interpreter"',
  ADDRESS_CACHE_TTL_HOURS: 'string.integer.parse = "24"',

  // Nominatim geocoding contact email. OSM usage policy requires identifying
  // contact info — without it the User-Agent is generic and OSM may
  // rate-limit or block requests. NominatimClient logs a startup warning
  // when this is missing.
  'NOMINATIM_CONTACT_EMAIL?': 'string',

  // PostGIS Address Lookup (local OSM data)
  POSTGIS_ADDRESS_ENABLED: BooleanString.default(false),
  POSTGIS_ADDRESS_DACH_ONLY: BooleanString.default(true),
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
    throw new ConfigurationError(`Configuration validation failed:\n${errorMessage}`);
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
