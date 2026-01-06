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
const pkg = require('../package.json') as { version: string };

// Read directly from process.env to avoid config validation during tests
const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.ENV || 'development';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: `freundebuch-backend@${pkg.version}`,

    // Performance monitoring - 100% sampling for MVP phase
    tracesSampleRate: 1.0,

    // Enable sending of default PII (useful for debugging but disable in prod if needed)
    sendDefaultPii: NODE_ENV !== 'production',

    // Capture pino log messages as breadcrumbs and errors, and trace postgres queries
    integrations: [
      Sentry.pinoIntegration({ log: { levels: ['info', 'warn', 'error'] } }),
      Sentry.postgresIntegration(),
    ],
    enableLogs: true,
  });
}
