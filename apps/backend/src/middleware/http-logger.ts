import type { MiddlewareHandler } from 'hono';
import type { AppContext } from '../types/context.js';

/**
 * HTTP request logger middleware using Pino.
 * Logs incoming requests and outgoing responses with timing information.
 */
export const httpLoggerMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;
  const logger = c.get('logger');

  // Log completed requests at info so production has access logs; keep the
  // noisy health probe at debug.
  const level = path === '/health' ? 'debug' : 'info';
  logger[level](
    {
      method,
      path,
      status,
      duration,
    },
    `${method} ${path} ${status} ${duration}ms`,
  );
};
