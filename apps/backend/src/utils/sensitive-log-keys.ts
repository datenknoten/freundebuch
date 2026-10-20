// Attribute keys that must never leave the process. Backstop for the pino
// redaction in utils/logger.ts — forwarded log attributes are scrubbed here
// too, since this is a personal CRM (names, emails, addresses) and the
// notification channels hold credentials that grant access on their own.
//
// resetUrl/verificationUrl are deliberately still here even though
// LOG_REDACT_PATHS no longer redacts them: the local debug log is the
// documented no-SMTP recovery path, Sentry is not.
export const SENSITIVE_LOG_KEYS = [
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
