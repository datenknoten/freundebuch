import type pg from 'pg';
import type { Logger } from 'pino';
import type { Config } from '../config.js';
import type { Auth, AuthSession } from '../lib/auth.js';
import type { AuthContext } from '../middleware/auth.js';

/**
 * Global context variables available throughout the Hono app.
 *
 * `user` and `session` are populated by authMiddleware; they are present on
 * any route mounted behind it. Public routes simply never read them.
 *
 * `config`, `auth` and `authPool` are app-wide, not per-request: createApp
 * sets them so the module-level routers can reach them until each router
 * receives its services through a factory.
 */
export type AppContext = {
  Variables: {
    db: pg.Pool;
    authPool: pg.Pool;
    config: Config;
    auth: Auth;
    logger: Logger;
    user: AuthContext;
    session: AuthSession;
  };
};
