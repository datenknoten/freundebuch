import pg from 'pg';
import { getConfig } from './config.ts';
import { createLogger } from './logger.ts';

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function createPool(): pg.Pool {
  if (pool instanceof pg.Pool) {
    return pool;
  }
  const config = getConfig();
  pool = new Pool({
    connectionString: config.DATABASE_URL,
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
  });
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
    logger.error({ error }, 'Database connection check failed');
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
