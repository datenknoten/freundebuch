import pino from 'pino';
import { getConfig } from './config.ts';

export function createLogger() {
  const config = getConfig();
  return pino({
    level: config.LOG_LEVEL,
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
