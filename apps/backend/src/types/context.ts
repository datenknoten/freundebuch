import type pg from 'pg';
import type { Logger } from 'pino';

/**
 * Global context variables available throughout the Hono app
 */
export type AppContext = {
  Variables: {
    db: pg.Pool;
    logger: Logger;
  };
};
