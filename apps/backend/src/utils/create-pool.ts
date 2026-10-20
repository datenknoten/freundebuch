import pg from 'pg';
import type { Logger } from 'pino';
import type { Config } from '../config.js';
import { enhanceErrorWithStack } from './enhance-error-with-stack.js';
import { toError } from './to-error.js';
import { wrapClient } from './wrap-client.js';

const { Pool } = pg;

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
    return connectAndWrap();
  };

  async function connectAndWrap() {
    const client: pg.PoolClient = await originalConnect();
    return wrapClient(client);
  }

  // biome-ignore lint/suspicious/noExplicitAny: matching pg's connect signature
  originalPool.connect = wrappedConnect as any;

  return originalPool;
}

export type PoolConfig = Pick<
  Config,
  | 'DATABASE_URL'
  | 'DATABASE_POOL_MIN'
  | 'DATABASE_POOL_MAX'
  | 'DATABASE_CONNECTION_TIMEOUT_MS'
  | 'DATABASE_IDLE_TIMEOUT_MS'
  | 'DATABASE_STATEMENT_TIMEOUT_MS'
>;

export interface PoolOptions {
  config: PoolConfig;
  logger: Logger;
}

export function createPool(options: PoolOptions) {
  const { config, logger } = options;
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
  rawPool.on('error', (err) => {
    logger.error({ err: toError(err) }, 'Idle pg client error');
  });

  return wrapPool(rawPool);
}
