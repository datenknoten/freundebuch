import pino from 'pino';
import { getConfig } from './config.js';

export function createLogger() {
  const config = getConfig();
  return pino({
    level: process.env.VITEST === 'true' ? 'silent' : config.LOG_LEVEL,
    redact: {
      // Backstop against PII reaching logs (and, via the Sentry pino
      // integration, Sentry). Call sites should log IDs not PII, but this
      // catches anything that slips through. This is a personal CRM — names,
      // emails and addresses are sensitive.
      paths: [
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
      ],
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
