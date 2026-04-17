import pino from 'pino';
import type { Config } from '../config.js';

export function createLogger(config: Config) {
  return pino({
    level: config.LOG_LEVEL,
    transport:
      config.ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });
}
