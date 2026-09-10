import pino from 'pino';
import { getConfig } from './config.js';

/**
 * Backstop against PII and credentials reaching logs (and, via the Sentry pino
 * integration, Sentry). Call sites should log IDs not PII, but this catches
 * anything that slips through. This is a personal CRM — names, emails and
 * addresses are sensitive, and notification channels carry bot tokens, access
 * tokens and webhook URLs that grant access on their own.
 *
 * Exported so the MCP server redacts the same paths.
 */
export const LOG_REDACT_PATHS = [
  'body.password',
  'body.token',
  'token',
  'password',
  'body.newPassword',
  'body.oldPassword',
  'email',
  '*.email',
  'body.email',
  'newEmail',
  'body.newEmail',
  'displayName',
  '*.displayName',
  'name',
  'address',
  '*.address',
  // Nested and array forms: a logged friend (or a list of them) puts the
  // sensitive fields two levels down, where the single-wildcard paths
  // above no longer match.
  '*.*.email',
  '*.*.address',
  '*.*.displayName',
  '*.password',
  '*.*.password',
  '*.token',
  '*.*.token',
  '*[*].email',
  '*[*].address',
  '*[*].displayName',
  // Credentials and single-use links.
  'accessToken',
  '*.accessToken',
  'botToken',
  '*.botToken',
  'webhookUrl',
  '*.webhookUrl',
  'cookie',
  '*.cookie',
  'set-cookie',
  '*.set-cookie',
  'authorization',
  '*.authorization',
  'passwordPrefix',
  // Deliberately NOT redacted: `resetUrl` / `verificationUrl`. Their only
  // writers are the `ENV !== 'production'` branches in lib/auth.ts, which log
  // at debug level when SMTP is unconfigured — the documented recovery path
  // for an instance without mail (docs/self-hosting.md). Production never logs
  // them. instrument.ts still strips them from anything reaching Sentry.
];

export function createLogger() {
  const config = getConfig();
  return pino({
    level: process.env.VITEST === 'true' ? 'silent' : config.LOG_LEVEL,
    redact: {
      paths: LOG_REDACT_PATHS,
    },
    transport:
      config.ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: "yyyy-mm-dd'T'HH:MM:ss.l'Z'",
            },
          }
        : undefined,
  });
}
