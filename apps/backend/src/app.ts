import { handleError } from '@datenknoten/kit/http';
import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type pg from 'pg';
import type { Logger } from 'pino';
import type { Config } from './config.js';
import { DatabaseConnectionError } from './errors/database-connection.error.js';
import type { Auth } from './lib/auth.js';
import { httpLoggerMiddleware } from './middleware/http-logger.js';
import { sentryTracingMiddleware } from './middleware/sentry.js';
import addressLookupRoutes from './routes/address-lookup.js';
import appPasswordsRoutes from './routes/app-passwords.js';
import authRoutes from './routes/auth.js';
import circlesRoutes from './routes/circles.js';
import collectivesRoutes from './routes/collectives.js';
import encountersRoutes from './routes/encounters.js';
import friendsRoutes from './routes/friends/index.js';
import healthRoutes from './routes/health.js';
import notificationChannelsRoutes from './routes/notification-channels.js';
import sentryTunnelRoutes from './routes/sentry-tunnel.js';
import uploadsRoutes from './routes/uploads.js';
import usersRoutes from './routes/users.js';
import type { AppContext } from './types/context.js';
import { checkDatabaseConnection } from './utils/db.js';
import { toError } from './utils/to-error.js';

export interface AppOptions {
  config: Config;
  logger: Logger;
  pool: pg.Pool;
  /** The search_path=auth pool behind `auth`; the readiness probe checks it too. */
  authPool: pg.Pool;
  auth: Auth;
}

export async function createApp(options: AppOptions) {
  const { config, logger, pool, authPool, auth } = options;
  const app = new Hono<AppContext>();

  const isDbConnected = await checkDatabaseConnection(pool, logger);

  if (isDbConnected === false) {
    throw new DatabaseConnectionError();
  }

  // Global context middleware - inject the app-wide dependencies and the request logger
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('db', pool);
    c.set('authPool', authPool);
    c.set('config', config);
    c.set('auth', auth);
    c.set('logger', logger.child({ requestId }));
    // Surface the correlation id so clients/frontend can quote it, and tag the
    // Sentry scope so captured errors are searchable by request id.
    c.header('X-Request-Id', requestId);
    Sentry.setTag('request_id', requestId);
    await next();
  });

  // Middleware
  app.use('*', httpLoggerMiddleware);
  app.use(
    '*',
    secureHeaders({
      // Allow cross-origin resource loading (needed for frontend to load images from backend)
      crossOriginResourcePolicy: 'cross-origin',
    }),
  );
  app.use(
    '*',
    cors({
      origin: config.FRONTEND_URL,
      credentials: true,
      // Allow Sentry tracing headers for distributed tracing
      allowHeaders: ['Content-Type', 'Authorization', 'sentry-trace', 'baggage'],
      exposeHeaders: ['sentry-trace', 'baggage'],
    }),
  );

  // Sentry tracing middleware - must come after CORS to access headers
  // This continues traces from the frontend for distributed tracing
  app.use('*', sentryTracingMiddleware);

  // Routes
  app.route('/health', healthRoutes);
  app.route('/api/auth', authRoutes);
  app.route('/api/users', usersRoutes);
  app.route('/api/friends', friendsRoutes);
  app.route('/api/circles', circlesRoutes);
  app.route('/api/collectives', collectivesRoutes);
  app.route('/api/encounters', encountersRoutes);
  app.route('/api/uploads', uploadsRoutes);
  app.route('/api/app-passwords', appPasswordsRoutes);
  app.route('/api/sentry-tunnel', sentryTunnelRoutes);
  app.route('/api/address-lookup', addressLookupRoutes);
  app.route('/api/notification-channels', notificationChannelsRoutes);

  // Error handling
  app.onError((err, c) => {
    // Fall back to the root logger: an error thrown before the context
    // middleware runs would leave c.get('logger') undefined.
    const { status, body } = handleError(err, c.get('logger') ?? logger);

    // Single Sentry capture point for the whole app: expected 4xx (validation,
    // not-found, etc.) are not reported.
    if (status >= 500) {
      Sentry.captureException(toError(err), {
        extra: { path: c.req.path, method: c.req.method },
      });
    }
    // handleError only answers with the statusCode of an HttpError subclass or
    // 400/404/500, all of which carry a body.
    return c.json(body, status as ContentfulStatusCode);
  });

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404);
  });

  return app;
}
