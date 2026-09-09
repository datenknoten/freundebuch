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

// Read directly from process.env to avoid config validation during tests.
//
// APP_ENV comes from ENV, not NODE_ENV. The two are deliberately separate:
// NODE_ENV drives Node and the ecosystem (dependency pruning at install,
// library dev/prod branches) while ENV describes the deployment this process
// is part of. Sentry wants the latter.
const SENTRY_DSN = process.env.SENTRY_DSN;
const APP_ENV = process.env.ENV || 'development';

const IS_PRODUCTION = APP_ENV === 'production';

// Attribute keys that must never leave the process. Backstop for the pino
// redaction in utils/logger.ts — forwarded log attributes are scrubbed here
// too, since this is a personal CRM (names, emails, addresses) and the
// notification channels hold credentials that grant access on their own.
const SENSITIVE_LOG_KEYS = [
  'email',
  'newEmail',
  'displayName',
  'name',
  'address',
  'password',
  'token',
  'accessToken',
  'botToken',
  'webhookUrl',
  'resetUrl',
  'verificationUrl',
  'authorization',
];

// Telegram puts the bot token in the request path
// (https://api.telegram.org/bot<token>/sendMessage), so the outgoing-HTTP spans
// carry it in their description and url attributes.
const BOT_TOKEN_IN_PATH = /\/bot[^/\s]+\//g;
const URL_ATTRIBUTES = ['http.url', 'url'];

function redactBotToken(value: string): string {
  return value.replace(BOT_TOKEN_IN_PATH, '/bot[redacted]/');
}

function redactUrlAttributes(data: Record<string, unknown> | undefined): void {
  if (data === undefined) {
    return;
  }
  for (const key of URL_ATTRIBUTES) {
    const value = data[key];
    if (typeof value === 'string') {
      data[key] = redactBotToken(value);
    }
  }
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
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

    // The health probes run every few seconds and say nothing about user-facing
    // latency.
    ignoreTransactions: [/^GET \/health(\/ready)?$/],

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

    // Spans are not covered by beforeSendLog; scrub the credential-bearing
    // request paths out of the trace itself.
    beforeSendTransaction: (event) => {
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
  });
}
