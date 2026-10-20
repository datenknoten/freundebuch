import pg from 'pg';
import type { PoolOptions } from '../utils/create-pool.js';
import { toError } from '../utils/to-error.js';

/**
 * Better Auth requires search_path=auth, so it needs its own pool. Pool sizes
 * are halved from the main pool to keep total connections in check.
 */
export function createAuthPool(options: PoolOptions) {
  const { config, logger } = options;
  const authPool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    options: '-c search_path=auth',
    min: Math.max(1, Math.floor(config.DATABASE_POOL_MIN / 2)),
    max: Math.max(2, Math.floor(config.DATABASE_POOL_MAX / 2)),
    connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: config.DATABASE_IDLE_TIMEOUT_MS,
    statement_timeout: config.DATABASE_STATEMENT_TIMEOUT_MS,
    query_timeout: config.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  // Without an 'error' listener, an idle-client error (DB restart, network
  // blip) is emitted as an unhandled 'error' event and crashes the process.
  authPool.on('error', (err) => {
    logger.error({ err: toError(err) }, 'Idle pg client error');
  });

  return authPool;
}
