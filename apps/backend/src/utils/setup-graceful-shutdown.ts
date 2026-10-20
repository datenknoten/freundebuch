import type pg from 'pg';
import type { Logger } from 'pino';
import { closePool } from './close-pool.js';
import { toError } from './to-error.js';

let isShuttingDown = false;

/** Matches node's http.Server for draining. */
interface ClosableServer {
  close(callback?: (err?: Error) => void): unknown;
}

interface StoppableTask {
  stop(): unknown;
}

interface ShutdownOptions {
  pool: pg.Pool;
  logger: Logger;
  server?: ClosableServer;
  tasks?: StoppableTask[];
}

export function setupGracefulShutdown({ pool, logger, server, tasks = [] }: ShutdownOptions) {
  async function shutdown(signal: string) {
    if (isShuttingDown === true) {
      return;
    }
    isShuttingDown = true;

    logger.info({ signal }, 'Signal received, starting graceful shutdown');

    // Force-exit if graceful teardown hangs. unref() so this timer alone
    // doesn't keep the event loop alive.
    const forceTimer = setTimeout(forceExit, 30000);
    forceTimer.unref();

    try {
      // 1. Stop cron jobs so no new scheduled work starts mid-shutdown.
      await Promise.all(tasks.map((task) => Promise.resolve(task.stop())));

      // 2. Stop accepting new connections and drain in-flight requests
      //    before tearing down the pool they depend on.
      if (server !== undefined) {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err !== undefined ? reject(err) : resolve()));
        });
      }

      // 3. Now that nothing is using the pool, close it.
      await closePool(pool);
      process.exit(0);
    } catch (error) {
      logger.error({ err: toError(error) }, 'Error during graceful shutdown');
      process.exit(1);
    }
  }

  function forceExit() {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}
