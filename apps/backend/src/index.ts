// IMPORTANT: Import Sentry instrumentation first, before any other modules
// This ensures pg and other modules are properly instrumented
import './instrument.js';

import { serve } from '@hono/node-server';
import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type pg from 'pg';
import { httpLoggerMiddleware } from './middleware/http-logger.js';
import { sentryTracingMiddleware } from './middleware/sentry.js';
import addressLookupRoutes from './routes/address-lookup.js';
import appPasswordsRoutes from './routes/app-passwords.js';
import authRoutes from './routes/auth.js';
import circlesRoutes from './routes/circles.js';
import collectivesRoutes from './routes/collectives.js';
import encountersRoutes from './routes/encounters.js';
import friendsRoutes from './routes/friends.js';
import healthRoutes from './routes/health.js';
import sentryTunnelRoutes from './routes/sentry-tunnel.js';
import uploadsRoutes from './routes/uploads.js';
import usersRoutes from './routes/users.js';
import { PhotoService } from './services/photo.service.js';
import type { AppContext } from './types/context.js';
import { initializeAddressCaches } from './utils/cache.js';
import { getConfig } from './utils/config.js';
import { checkDatabaseConnection, createPool } from './utils/db.js';
import { DatabaseConnectionError } from './utils/errors.js';
import { createLogger } from './utils/logger.js';
import { setupCleanupScheduler } from './utils/scheduler.js';

Error.stackTraceLimit = 100;

export async function createApp(pool: pg.Pool) {
  const config = getConfig();
  const app = new Hono<AppContext>();
  const logger = createLogger();

  const dbConnected = await checkDatabaseConnection(pool);

  if (dbConnected === false) {
    throw new DatabaseConnectionError();
  }

  // Global context middleware - inject db and logger
  app.use('*', async (c, next) => {
    c.set('db', pool);
    c.set('logger', logger.child({ requestId: crypto.randomUUID() }));
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

  // Error handling
  app.onError((err, c) => {
    const pinoLogger = c.get('logger');
    pinoLogger.error({ err }, 'Unhandled error');

    // Report error to Sentry
    Sentry.captureException(err, {
      extra: {
        path: c.req.path,
        method: c.req.method,
      },
    });

    return c.json(
      {
        status: 500,
        error: 'Internal Server Error',
      },
      500,
    );
  });

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404);
  });

  return app;
}

export async function startServer() {
  const config = getConfig();
  const pool = createPool();
  const app = await createApp(pool);
  const port = config.PORT;
  const pinoLogger = createLogger();

  // Migrate uploads directory from legacy 'contacts' path to 'friends'
  await PhotoService.migrateFromLegacyPath(pinoLogger);

  // Import setupGracefulShutdown lazily to avoid side effects
  import('./utils/db.js').then(({ setupGracefulShutdown }) => {
    setupGracefulShutdown(pool);
  });

  // Initialize address caches with database pool for persistence
  initializeAddressCaches(pool, pinoLogger);

  // Validate optional API keys at startup
  if (!config.ZIPCODEBASE_API_KEY) {
    pinoLogger.warn('ZIPCODEBASE_API_KEY not configured - address lookup will be disabled');
  }

  // Setup cleanup scheduler for expired sessions, tokens, and cache
  setupCleanupScheduler(pool, pinoLogger);

  pinoLogger.info(`Starting server on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });

  return { app, port, logger: pinoLogger };
}

// Only start server if this file is being run directly
if (import.meta.main === true) {
  startServer();
}
