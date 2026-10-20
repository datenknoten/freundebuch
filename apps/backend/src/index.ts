import { exitWith } from '@datenknoten/kit/cli';
import { createRootLogger } from '@datenknoten/kit/logger';
import { serve } from '@hono/node-server';
import * as Sentry from '@sentry/node';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createAuth, createAuthPool } from './lib/auth.js';
import { initializeAddressCaches } from './utils/cache.js';
import {
  deriveCredentialsKey,
  encryptLegacyNotificationCredentials,
} from './utils/credentials-crypto.js';
import { createPool, setupGracefulShutdown } from './utils/db.js';
import { toError } from './utils/errors.js';
import { LOG_REDACT_PATHS } from './utils/logger.js';
import { setupCleanupScheduler, setupNotificationScheduler } from './utils/scheduler.js';

const PRETTY_TRANSPORT = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: "yyyy-mm-dd'T'HH:MM:ss.l'Z'",
  },
};

async function main() {
  Error.stackTraceLimit = 100;

  const config = loadConfig();
  const logger = createRootLogger(config, {
    redactPaths: LOG_REDACT_PATHS,
    ...(config.ENV === 'development' ? { transport: PRETTY_TRANSPORT } : {}),
  });

  // Last-resort handlers so an unhandled rejection / uncaught exception is
  // logged and reported to Sentry instead of silently killing the process.
  process.on('unhandledRejection', (reason) => {
    const err = toError(reason);
    logger.error({ err }, 'Unhandled promise rejection');
    Sentry.captureException(err);
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    Sentry.captureException(err);
  });

  const pool = createPool({ config, logger: logger.child({ module: 'db' }) });
  const authPool = createAuthPool({ config, logger: logger.child({ module: 'auth-db' }) });
  const auth = createAuth({ config, pool: authPool, logger });
  const app = await createApp({ config, logger, pool, authPool, auth });

  initializeAddressCaches(pool, logger);

  // One-shot conversion of credentials written before encryption at rest
  // existed. Idempotent, so it stays harmless on every later boot.
  const credentialsKey = deriveCredentialsKey(config.BETTER_AUTH_SECRET);
  await encryptLegacyNotificationCredentials(
    pool,
    logger.child({ module: 'credentials' }),
    credentialsKey,
  );

  const schedulerLogger = logger.child({ module: 'scheduler' });
  const cleanupTask = setupCleanupScheduler(pool, schedulerLogger);
  const notificationTask = setupNotificationScheduler({
    pool,
    logger: schedulerLogger,
    credentialsKey,
    config,
  });

  logger.info({ port: config.PORT }, 'Starting server');

  const server = serve({
    fetch: app.fetch,
    port: config.PORT,
  });

  // Register graceful shutdown now that the server and cron tasks exist, so
  // SIGTERM/SIGINT stops cron, drains in-flight requests, then closes the pool.
  setupGracefulShutdown({ pool, logger, server, tasks: [cleanupTask, notificationTask] });
}

void main().catch(exitWith);
