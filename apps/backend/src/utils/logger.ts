import pino from 'pino';
import { getConfig } from './config.js';

export function createLogger() {
  const config = getConfig();
  return pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        'body.password',
        'body.token',
        'token',
        'password',
        'body.newPassword',
        'body.oldPassword',
      ],
    },
    transport:
      config.ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          }
        : undefined,
  });
}
