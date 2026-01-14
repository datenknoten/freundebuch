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
    .filter((line) => !line.includes('db.ts')) // Remove our wrapper frames
    .join('\n');

  err.stack = `${originalStack}\n    --- Query initiated from ---\n${callSiteFrames}`;
  return err;
}

/**
 * Wraps a pg.PoolClient to capture stack traces for query errors
 */
function wrapClient(client: pg.PoolClient): pg.PoolClient {
  const originalQuery = client.query.bind(client) as pg.PoolClient['query'];

  // Override query to capture stack trace
  const wrappedQuery = function (
    this: pg.PoolClient,
    // biome-ignore lint/suspicious/noExplicitAny: pg.PoolClient.query has complex overloads
    ...args: [queryTextOrConfig: any, ...rest: any[]]
    // biome-ignore lint/suspicious/noExplicitAny: pg.PoolClient.query has complex return types
  ): any {
    const callSiteError = new Error();
    Error.captureStackTrace?.(callSiteError, wrappedQuery);

    // biome-ignore lint/suspicious/noExplicitAny: matching pg's query signature
    const result = (originalQuery as (...args: any[]) => any)(...args);

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

  return client;
}

/**
 * Wraps a pg.Pool to capture stack traces for query errors.
 * This ensures that when database errors occur, the full application
 * stack trace is preserved, showing which route/service initiated the query.
 */
function wrapPool(originalPool: pg.Pool): pg.Pool {
  const originalQuery = originalPool.query.bind(originalPool) as pg.Pool['query'];
  const originalConnect = originalPool.connect.bind(originalPool) as pg.Pool['connect'];

  // Override query to capture stack trace at call site
  const wrappedPoolQuery = function (
    this: pg.Pool,
    // biome-ignore lint/suspicious/noExplicitAny: pg.Pool.query has complex overloads
    ...args: [queryTextOrConfig: any, ...rest: any[]]
    // biome-ignore lint/suspicious/noExplicitAny: pg.Pool.query has complex return types
  ): any {
    const callSiteError = new Error();
    Error.captureStackTrace?.(callSiteError, wrappedPoolQuery);

    // biome-ignore lint/suspicious/noExplicitAny: matching pg's query signature
    const result = (originalQuery as (...args: any[]) => any)(...args);

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
    return (originalConnect as () => Promise<pg.PoolClient>)().then((client: pg.PoolClient) =>
      wrapClient(client),
    );
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
  });
  pool = wrapPool(rawPool);
  return pool;
}

export async function checkDatabaseConnection(dbPool: pg.Pool): Promise<boolean> {
  try {
    const client = await dbPool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    const logger = createLogger();
    const err = toError(error);
    logger.error({ err }, 'Database connection check failed');
    return false;
  }
}

export async function closePool(pool: pg.Pool): Promise<void> {
  await pool.end();
}

let isShuttingDown = false;

export function setupGracefulShutdown(pool: pg.Pool): void {
  const logger = createLogger();
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} received, starting graceful shutdown`);

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000); // 30 second timeout

    await closePool(pool);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
