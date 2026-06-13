import type pg from 'pg';
import type { Logger } from 'pino';
import type { AuthContext, AuthSession } from '../middleware/auth.js';

/**
 * Global context variables available throughout the Hono app.
 *
 * `user` and `session` are populated by authMiddleware; they are present on
 * any route mounted behind it. Public routes simply never read them.
 */
export type AppContext = {
  Variables: {
    db: pg.Pool;
    logger: Logger;
    user: AuthContext;
    session: AuthSession;
  };
};
