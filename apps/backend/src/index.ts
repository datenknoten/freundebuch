import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type pg from 'pg';
import authRoutes from './routes/auth.js';
import contactsRoutes from './routes/contacts.js';
import healthRoutes from './routes/health.js';
import usersRoutes from './routes/users.js';
import type { AppContext } from './types/context.js';
import { getConfig } from './utils/config.js';
import { checkDatabaseConnection, createPool } from './utils/db.js';
import { createLogger } from './utils/logger.js';
import { setupCleanupScheduler } from './utils/scheduler.js';

Error.stackTraceLimit = 100;

export async function createApp(pool: pg.Pool) {
  const config = getConfig();
  const app = new Hono<AppContext>();
  const logger = createLogger();

  const dbConnected = await checkDatabaseConnection(pool);

  if (dbConnected === false) {
    throw new Error('No Database Connection');
  }

  // Global context middleware - inject db and logger
  app.use('*', async (c, next) => {
    c.set('db', pool);
    c.set('logger', logger.child({ requestId: crypto.randomUUID() }));
    await next();
  });

  // Middleware
  app.use('*', honoLogger());
  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: config.FRONTEND_URL,
      credentials: true,
    }),
  );

  // Routes
  app.route('/health', healthRoutes);
  app.route('/api/auth', authRoutes);
  app.route('/api/users', usersRoutes);
  app.route('/api/contacts', contactsRoutes);

  // Error handling
  app.onError((err, c) => {
    const pinoLogger = c.get('logger');
    pinoLogger.error({ err }, 'Unhandled error');
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

  // Import setupGracefulShutdown lazily to avoid side effects
  import('./utils/db.js').then(({ setupGracefulShutdown }) => {
    setupGracefulShutdown(pool);
  });

  // Setup cleanup scheduler for expired sessions and tokens
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
