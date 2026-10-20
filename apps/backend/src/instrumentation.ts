/**
 * Sentry instrumentation, preloaded with `node --import` so Sentry patches
 * modules like 'pg' before the application loads them. Sentry uses
 * monkey-patching, which only works on modules loaded after its init.
 */
import { createRequire } from 'node:module';
import * as Sentry from '@sentry/node';
import { redactBotToken } from './utils/redact-bot-token.js';
import { redactUrlAttributes } from './utils/redact-url-attributes.js';
import { scrubBreadcrumb } from './utils/scrub-breadcrumb.js';
import { scrubErrorEvent } from './utils/scrub-error-event.js';
import { SENSITIVE_LOG_KEYS } from './utils/sensitive-log-keys.js';

// Read version from package.json for release tracking
const require = createRequire(import.meta.url);
// biome-ignore lint/correctness/useImportExtensions: package.json is correct, not package.js
const pkg: Record<string, unknown> = require('../package.json');
const pkgVersion = typeof pkg.version === 'string' ? pkg.version : 'unknown';

// Read directly from process.env: this file runs before the application and
// its config module exist.
//
// The environment comes from ENV, not NODE_ENV. The two are deliberately
// separate: NODE_ENV drives Node and the ecosystem (dependency pruning at
// install, library dev/prod branches) while ENV describes the deployment this
// process is part of. Sentry wants the latter.
const sentryDsn = process.env.SENTRY_DSN;
const rawEnv = process.env.ENV;
const appEnv = rawEnv === undefined || rawEnv === '' ? 'development' : rawEnv;

const isProduction = appEnv === 'production';

if (sentryDsn !== undefined && sentryDsn !== '') {
  Sentry.init({
    dsn: sentryDsn,
    environment: appEnv,
    release: `freundebuch-backend@${pkgVersion}`,

    // Full tracing in dev for debugging; sample in production to bound cost.
    tracesSampleRate: isProduction === true ? 0.1 : 1.0,

    // Default PII (request IP, headers) only outside production.
    sendDefaultPii: isProduction === false,

    // Capture pino log messages as breadcrumbs and errors, and trace postgres queries
    integrations: [
      Sentry.pinoIntegration({ log: { levels: ['info', 'warn', 'error'] } }),
      Sentry.postgresIntegration(),
    ],
    enableLogs: true,

    // The health probes run every few seconds and say nothing about user-facing
    // latency.
    ignoreTransactions: [/^GET \/health(\/ready)?$/],

    // Strip sensitive attributes from forwarded logs before they leave the process.
    beforeSendLog(log) {
      if (log.attributes !== undefined) {
        for (const key of SENSITIVE_LOG_KEYS) {
          if (key in log.attributes) {
            delete log.attributes[key];
          }
        }
      }
      return log;
    },

    // Spans are not covered by beforeSendLog; scrub the credential-bearing
    // request paths out of the trace itself.
    beforeSendTransaction(event) {
      for (const span of event.spans ?? []) {
        if (span.description !== undefined) {
          span.description = redactBotToken(span.description);
        }
        redactUrlAttributes(span.data);
      }
      if (event.transaction !== undefined) {
        event.transaction = redactBotToken(event.transaction);
      }
      redactUrlAttributes(event.contexts?.trace?.data);
      return event;
    },

    // Error events bypass both hooks above; scrub their breadcrumbs on the way
    // in and the event itself on the way out.
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubErrorEvent,
  });
}
