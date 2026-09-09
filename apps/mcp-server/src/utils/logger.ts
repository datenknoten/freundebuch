import { LOG_REDACT_PATHS } from '@freundebuch/backend/utils/logger.js';
import pino from 'pino';
import type { Config } from '../config.js';

export function createLogger(config: Config) {
  return pino({
    level: config.LOG_LEVEL,
    // The MCP server logs the same domain objects as the backend, so it shares
    // the backend's redaction list rather than growing a second one.
    redact: { paths: LOG_REDACT_PATHS },
    transport:
      config.ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });
}
