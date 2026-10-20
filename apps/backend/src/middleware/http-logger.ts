import type { Context, Next } from 'hono';
import type { AppContext } from '../types/context.js';

export async function httpLoggerMiddleware(c: Context<AppContext>, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;
  const logger = c.get('logger');

  // Log completed requests at info so production has access logs; keep the
  // noisy health probes at debug.
  const level = path === '/health' || path === '/health/ready' ? 'debug' : 'info';
  logger[level](
    {
      method,
      path,
      status,
      duration,
    },
    `${method} ${path} ${status} ${duration}ms`,
  );
}
