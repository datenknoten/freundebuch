import pg from 'pg';
import { getConfig } from './config.js';
import { toError } from './errors.js';
import { createLogger } from './logger.js';

const { Pool } = pg;

let pool: pg.Pool | undefined;

/**
 * Enhances a database error with the original call site stack trace.
 * This fixes the issue where async pg errors lose the application stack trace.
 */
function enhanceErrorWithStack(error: unknown, callSiteStack: string): Error {
  const err = toError(error);
  // Append the call site stack to show where the query originated
  const originalStack = err.stack ?? '';
  const callSiteFrames = callSiteStack
    .split('\n')
    .slice(1) // Remove the "Error" line
    .filter((line) => !line.includes('/db.js') && !line.includes('/db.ts')) // Remove our wrapper frames
    .join('\n');

  err.stack = `${originalStack}\n    --- Query initiated from ---\n${callSiteFrames}`;
  return err;
}

// Pooled clients are long-lived and reused across many checkouts. Marking a
// client once it's wrapped prevents re-wrapping its `query` on every checkout,
// which would otherwise nest the wrapper deeper each time until invoking
// `client.query` overflows the call stack ("Maximum call stack size exceeded").
// Symbol.for keeps the marker stable across module instances (e.g. tooling
// resolving both db.js and db.ts), so a client wrapped by one instance is still
// recognised as wrapped by another.
const WRAPPED = Symbol.for('freundebuch.queryWrapped');

/**
 * Wraps a pg.PoolClient to capture stack traces for query errors.
 * Idempotent: a client whose query is already wrapped is returned unchanged,
 * so reusing a pooled client never stacks wrappers.
 *
 * Exported for testing.
 */
export function wrapClient(client: pg.PoolClient): pg.PoolClient {
  // biome-ignore lint/suspicious/noExplicitAny: marker property on the pg client
  if ((client as any)[WRAPPED]) {
    return client;
  }

  // biome-ignore lint/suspicious/noExplicitAny: preserving pg's query overload signature
  const originalQuery: (...args: any[]) => any = client.query.bind(client);

  // Override query to capture stack trace
  const wrappedQuery = function (
    this: pg.PoolClient,
    // biome-ignore lint/suspicious/noExplicitAny: pg.PoolClient.query has complex overloads
    ...args: [queryTextOrConfig: any, ...rest: any[]]
    // biome-ignore lint/suspicious/noExplicitAny: pg.PoolClient.query has complex return types
  ): any {
    const callSiteError = new Error();
    Error.captureStackTrace?.(callSiteError, wrappedQuery);

    const result = originalQuery(...args);

    // Handle both Promise and callback patterns
    if (result instanceof Promise) {
      return result.catch((error: unknown) => {
        throw enhanceErrorWithStack(error, callSiteError.stack ?? '');
      });
    }
    return result;
  };

  // biome-ignore lint/suspicious/noExplicitAny: matching pg's query signature
  client.query = wrappedQuery as any;
  // biome-ignore lint/suspicious/noExplicitAny: marker property on the pg client
  (client as any)[WRAPPED] = true;

  return client;
}

/**
 * Wraps a pg.Pool to capture stack traces for query errors.
 * This ensures that when database errors occur, the full application
 * stack trace is preserved, showing which route/service initiated the query.
 */
function wrapPool(originalPool: pg.Pool): pg.Pool {
  // biome-ignore lint/suspicious/noExplicitAny: preserving pg's query overload signature
  const originalQuery: (...args: any[]) => any = originalPool.query.bind(originalPool);
  // biome-ignore lint/suspicious/noExplicitAny: preserving pg's connect overload signature
  const originalConnect: (...args: any[]) => any = originalPool.connect.bind(originalPool);

  // Override query to capture stack trace at call site
  const wrappedPoolQuery = function (
    this: pg.Pool,
    // biome-ignore lint/suspicious/noExplicitAny: pg.Pool.query has complex overloads
    ...args: [queryTextOrConfig: any, ...rest: any[]]
    // biome-ignore lint/suspicious/noExplicitAny: pg.Pool.query has complex return types
  ): any {
    const callSiteError = new Error();
    Error.captureStackTrace?.(callSiteError, wrappedPoolQuery);

    const result = originalQuery(...args);

    if (result instanceof Promise) {
      return result.catch((error: unknown) => {
        throw enhanceErrorWithStack(error, callSiteError.stack ?? '');
      });
    }
    return result;
  };

  // biome-ignore lint/suspicious/noExplicitAny: matching pg's query signature
  originalPool.query = wrappedPoolQuery as any;

  // Override connect to wrap the returned client
  const wrappedConnect = function (
    this: pg.Pool,
    // biome-ignore lint/suspicious/noExplicitAny: pg.Pool.connect has complex overloads
    callback?: any,
    // biome-ignore lint/suspicious/noExplicitAny: pg.Pool.connect has complex return types
  ): any {
    // Handle callback style
    if (typeof callback === 'function') {
      return originalConnect(
        (
          err: Error | undefined,
          client: pg.PoolClient | undefined,
          release: (release?: boolean) => void,
        ) => {
          if (err || !client) {
            callback(err, client, release);
          } else {
            callback(undefined, wrapClient(client), release);
          }
        },
      );
    }

    // Handle promise style
    return originalConnect().then((client: pg.PoolClient) => wrapClient(client));
  };

  // biome-ignore lint/suspicious/noExplicitAny: matching pg's connect signature
  originalPool.connect = wrappedConnect as any;

  return originalPool;
}

export function createPool(): pg.Pool {
  if (pool instanceof pg.Pool) {
    return pool;
  }
  const config = getConfig();
  const rawPool = new Pool({
    connectionString: config.DATABASE_URL,
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
    connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: config.DATABASE_IDLE_TIMEOUT_MS,
    statement_timeout: config.DATABASE_STATEMENT_TIMEOUT_MS,
    query_timeout: config.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  // Without an 'error' listener, an idle-client error (DB restart, network
  // blip) is emitted as an unhandled 'error' event and crashes the process.
  const poolLogger = createLogger();
  rawPool.on('error', (err) => {
    poolLogger.error({ err: toError(err) }, 'Idle pg client error');
  });

  pool = wrapPool(rawPool);
  return pool;
}

export async function checkDatabaseConnection(dbPool: pg.Pool): Promise<boolean> {
  let client: pg.PoolClient | undefined;
  try {
    client = await dbPool.connect();
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    const logger = createLogger();
    const err = toError(error);
    logger.error({ err }, 'Database connection check failed');
    return false;
  } finally {
    client?.release();
  }
}

export async function closePool(pool: pg.Pool): Promise<void> {
  await pool.end();
}

/**
 * Run `fn` inside a database transaction: BEGIN, then COMMIT on success or
 * ROLLBACK on error. Rollback and release failures are swallowed so they
 * can't mask the original error, and the client is always released.
 */
export async function withTransaction<T>(
  pool: pg.Pool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors to preserve the original error.
    }
    throw error;
  } finally {
    try {
      client.release();
    } catch {
      // Prevent a release failure from masking the original error.
    }
  }
}

let isShuttingDown = false;

/** Minimal shape of an http server we need for draining (matches node http.Server). */
interface ClosableServer {
  close(callback?: (err?: Error) => void): unknown;
}

/** Minimal shape of a scheduled cron task we need to stop. */
interface StoppableTask {
  stop(): unknown;
}

interface ShutdownOptions {
  pool: pg.Pool;
  server?: ClosableServer;
  tasks?: StoppableTask[];
}

export function setupGracefulShutdown({ pool, server, tasks = [] }: ShutdownOptions): void {
  const logger = createLogger();
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} received, starting graceful shutdown`);

    // Force-exit if graceful teardown hangs. unref() so this timer alone
    // doesn't keep the event loop alive.
    const forceTimer = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
    forceTimer.unref();

    try {
      // 1. Stop cron jobs so no new scheduled work starts mid-shutdown.
      await Promise.all(tasks.map((task) => Promise.resolve(task.stop())));

      // 2. Stop accepting new connections and drain in-flight requests
      //    before tearing down the pool they depend on.
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
      }

      // 3. Now that nothing is using the pool, close it.
      await closePool(pool);
      process.exit(0);
    } catch (error) {
      logger.error({ err: toError(error) }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
