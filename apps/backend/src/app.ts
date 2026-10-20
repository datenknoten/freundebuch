import { handleError } from '@datenknoten/kit/http';
import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type pg from 'pg';
import type { Logger } from 'pino';
import type { Config } from './config.js';
import { createServices } from './create-services.js';
import { DatabaseConnectionError } from './errors/database-connection.error.js';
import type { Auth } from './lib/auth.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { httpLoggerMiddleware } from './middleware/http-logger.js';
import { createOnboardingMiddleware } from './middleware/onboarding.js';
import { createRateLimitMiddleware, type LimiterName } from './middleware/rate-limit.js';
import { sentryTracingMiddleware } from './middleware/sentry.js';
import { createAddressLookupRoutes } from './routes/address-lookup.js';
import { createAppPasswordsRoutes } from './routes/app-passwords.js';
import { createAuthRoutes } from './routes/auth.js';
import { createCirclesRoutes } from './routes/circles.js';
import { createCollectivesRoutes } from './routes/collectives.js';
import { createEncountersRoutes } from './routes/encounters.js';
import { createFriendsRoutes } from './routes/friends/friends.routes.js';
import { createHealthRoutes } from './routes/health.js';
import { createNotificationChannelsRoutes } from './routes/notification-channels.js';
import { createSentryTunnelRoutes } from './routes/sentry-tunnel.js';
import { createUploadsRoutes } from './routes/uploads.js';
import { createUsersRoutes } from './routes/users.js';
import type { AppContext } from './types/context.js';
import { checkDatabaseConnection } from './utils/check-database-connection.js';
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
  const { config, logger, pool } = options;
  const app = new Hono<AppContext>();

  const isDbConnected = await checkDatabaseConnection(pool, logger);

  if (isDbConnected === false) {
    throw new DatabaseConnectionError();
  }

  const services = createServices(options);
  const authMiddleware = createAuthMiddleware({ auth: services.auth });
  const onboardingMiddleware = createOnboardingMiddleware({ usersService: services.usersService });
  function rateLimit(limiter: LimiterName) {
    return createRateLimitMiddleware({ config, limiter });
  }

  // Global context middleware - inject the request logger
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
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
  app.route('/health', createHealthRoutes(services));
  app.route(
    '/api/auth',
    createAuthRoutes({
      ...services,
      authMiddleware,
      passkeyListRateLimitMiddleware: rateLimit('passkeyList'),
    }),
  );
  app.route('/api/users', createUsersRoutes({ ...services, authMiddleware }));
  app.route(
    '/api/friends',
    createFriendsRoutes({
      ...services,
      authMiddleware,
      onboardingMiddleware,
      rateLimitMiddleware: rateLimit('friends'),
    }),
  );
  app.route(
    '/api/circles',
    createCirclesRoutes({
      ...services,
      authMiddleware,
      onboardingMiddleware,
      rateLimitMiddleware: rateLimit('circles'),
    }),
  );
  app.route(
    '/api/collectives',
    createCollectivesRoutes({
      ...services,
      authMiddleware,
      onboardingMiddleware,
      rateLimitMiddleware: rateLimit('collectives'),
    }),
  );
  app.route(
    '/api/encounters',
    createEncountersRoutes({
      ...services,
      authMiddleware,
      onboardingMiddleware,
      rateLimitMiddleware: rateLimit('encounters'),
    }),
  );
  app.route(
    '/api/uploads',
    createUploadsRoutes({ ...services, authMiddleware, onboardingMiddleware }),
  );
  app.route(
    '/api/app-passwords',
    createAppPasswordsRoutes({ ...services, authMiddleware, onboardingMiddleware }),
  );
  app.route(
    '/api/sentry-tunnel',
    createSentryTunnelRoutes({ ...services, rateLimitMiddleware: rateLimit('sentryTunnel') }),
  );
  app.route(
    '/api/address-lookup',
    createAddressLookupRoutes({
      ...services,
      authMiddleware,
      onboardingMiddleware,
      rateLimitMiddleware: rateLimit('addressLookup'),
    }),
  );
  app.route(
    '/api/notification-channels',
    createNotificationChannelsRoutes({
      ...services,
      authMiddleware,
      onboardingMiddleware,
      rateLimitMiddleware: rateLimit('notificationChannels'),
      testRateLimitMiddleware: rateLimit('notificationTest'),
    }),
  );

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
