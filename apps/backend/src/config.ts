import path from 'node:path';
import { LOG_LEVELS } from '@datenknoten/kit/logger';
import { parseEnv } from '@datenknoten/kit/schema';
import { type } from 'arktype';

const BooleanString = type('"true" | "false" | "TRUE" | "FALSE" | "1" | "0" | boolean').pipe(
  (result) => result === 'true' || result === '1' || result === 'TRUE' || result === true,
);

// The dev compose default and .env.example placeholders are rejected on
// purpose, so a copied dev secret cannot reach production. narrow() rather
// than and(/regex/) because the arktype summary for a negative lookahead is
// `must be matched by /^(?!...)/`, which tells the operator nothing.
const PLACEHOLDER_SECRET = /change-this|your-secret|REPLACE/;
const SecretType = type('string >= 32').narrow((value, ctx) =>
  PLACEHOLDER_SECRET.test(value) === true
    ? ctx.mustBe('a generated secret (e.g. `openssl rand -hex 32`), not the placeholder')
    : true,
);

// Validate the connection string shape at boot rather than failing on first
// connect with an opaque error.
const DatabaseUrlType = type('string').and(/^postgres(?:ql)?:\/\//);

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
  // Each hop appends its own peer to X-Forwarded-For, so the client address is
  // that many entries from the right - not simply the last one. The nginx
  // images run the realip module whenever NGINX_REAL_IP_FROM lists the proxies
  // in front of them (default: RFC1918 in the multi-service nginx image, empty
  // in the all-in-one image). With realip active nginx appends the resolved
  // client rather than its own peer, so the client is the last entry and 1 is
  // correct even behind Traefik; without it the count is the number of proxies
  // (2 for Traefik -> nginx). Only consulted when TRUST_PROXY is set.
  TRUSTED_PROXY_HOPS: type('string.integer.parse').to('number >= 1').default('1'),

  // Authentication (Better Auth)
  BETTER_AUTH_SECRET: SecretType,
  // Public origin of the deployment (e.g. https://freundebuch.example.com).
  // createAuth passes it to Better Auth as the issuer/base URL and derives the
  // OAuth `resource` audience from it. Optional: when unset, FRONTEND_URL
  // stands in, which equals the public origin in production.
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

  LOG_LEVEL: type.enumerated(...LOG_LEVELS).default('info'),

  // Off only where suites fire bursts of requests (the test env). Switches
  // both the per-router limiters and Better Auth's sign-in limiter.
  RATE_LIMIT_ENABLED: BooleanString.default(true),

  // Where uploaded friend photos live. In production a bind-mounted volume.
  UPLOAD_DIR: type('string').default(() => path.join(process.cwd(), 'uploads', 'friends')),

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

export function loadConfig(
  // biome-ignore lint/style/noProcessEnv: the config module is the one reader of the environment
  env: Record<string, string | undefined> = process.env,
) {
  const config: Config = parseEnv(ConfigSchema, env);
  return config;
}
