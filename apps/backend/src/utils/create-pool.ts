import pg from 'pg';
import type { Logger } from 'pino';
import type { Config } from '../config.js';
import { enhanceErrorWithStack } from './enhance-error-with-stack.js';
import { toError } from './to-error.js';
import { wrapClient } from './wrap-client.js';

const { Pool } = pg;

/**
 * Keeps the application stack on query errors, so a database error shows which
 * route or service issued the query.
 */
function wrapPool(originalPool: pg.Pool) {
  // biome-ignore lint/suspicious/noExplicitAny: preserving pg's query overload signature
  const originalQuery: (...args: any[]) => any = originalPool.query.bind(originalPool);
  // biome-ignore lint/suspicious/noExplicitAny: preserving pg's connect overload signature
  const originalConnect: (...args: any[]) => any = originalPool.connect.bind(originalPool);

  const wrappedPoolQuery = function (
    this: pg.Pool,
    // biome-ignore lint/suspicious/noExplicitAny: pg.Pool.query has complex overloads
    ...args: [queryTextOrConfig: any, ...rest: any[]]
  ) {
    const callSiteError = new Error();
    Error.captureStackTrace?.(callSiteError, wrappedPoolQuery);

    const result = originalQuery(...args);

    if (result instanceof Promise) {
      return result.catch(rethrowWithCallSite);
    }
    return result;

    function rethrowWithCallSite(error: unknown) {
      throw enhanceErrorWithStack(error, callSiteError.stack ?? '');
    }
  };

  // biome-ignore lint/suspicious/noExplicitAny: matching pg's query signature
  originalPool.query = wrappedPoolQuery as any;

  const wrappedConnect = function (
    this: pg.Pool,
    // biome-ignore lint/suspicious/noExplicitAny: pg.Pool.connect has complex overloads
    callback?: any,
  ) {
    if (typeof callback === 'function') {
      return originalConnect(forwardWrappedClient);
    }

    return connectAndWrap();

    function forwardWrappedClient(
      err: Error | null | undefined,
      client: pg.PoolClient | undefined,
      release: (release?: boolean) => void,
    ) {
      if ((err !== undefined && err !== null) || client === undefined) {
        callback(err, client, release);
      } else {
        callback(undefined, wrapClient(client), release);
      }
    }
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
