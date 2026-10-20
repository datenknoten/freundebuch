import type pg from 'pg';
import type { Logger } from 'pino';
import { toError } from './to-error.js';

export async function checkDatabaseConnection(dbPool: pg.Pool, logger: Logger) {
  let client: pg.PoolClient | undefined;
  try {
    client = await dbPool.connect();
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error({ err: toError(error) }, 'Database connection check failed');
    return false;
  } finally {
    client?.release();
  }
}
