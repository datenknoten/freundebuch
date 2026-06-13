/**
 * Sentry instrumentation file
 *
 * IMPORTANT: This file must be imported BEFORE any other modules that need
 * to be instrumented (like 'pg'). Sentry uses monkey-patching to add
 * instrumentation, which only works if Sentry is initialized before the
 * modules are loaded.
 */
import { createRequire } from 'node:module';
import * as Sentry from '@sentry/node';

// Read version from package.json for release tracking
const require = createRequire(import.meta.url);
// biome-ignore lint/correctness/useImportExtensions: package.json is correct, not package.js
const pkg: Record<string, unknown> = require('../package.json');
const pkgVersion = typeof pkg.version === 'string' ? pkg.version : 'unknown';

// Read directly from process.env to avoid config validation during tests
const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.ENV || 'development';

const IS_PRODUCTION = NODE_ENV === 'production';

// Attribute keys that must never leave the process. Backstop for the pino
// redaction in utils/logger.ts — forwarded log attributes are scrubbed here
// too, since this is a personal CRM (names, emails, addresses).
const SENSITIVE_LOG_KEYS = [
  'email',
  'newEmail',
  'displayName',
  'name',
  'address',
  'password',
  'token',
];

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: `freundebuch-backend@${pkgVersion}`,

    // Full tracing in dev for debugging; sample in production to bound cost.
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

    // Default PII (request IP, headers) only outside production.
    sendDefaultPii: !IS_PRODUCTION,

    // Capture pino log messages as breadcrumbs and errors, and trace postgres queries
    integrations: [
      Sentry.pinoIntegration({ log: { levels: ['info', 'warn', 'error'] } }),
      Sentry.postgresIntegration(),
    ],
    enableLogs: true,

    // Strip sensitive attributes from forwarded logs before they leave the process.
    beforeSendLog: (log) => {
      if (log.attributes) {
        for (const key of SENSITIVE_LOG_KEYS) {
          if (key in log.attributes) {
            delete log.attributes[key];
          }
        }
      }
      return log;
    },
  });
}
