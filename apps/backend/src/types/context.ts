import type { Logger } from 'pino';
import type { AuthSession } from '../lib/auth.js';
import type { AuthContext } from '../middleware/auth.js';

/**
 * Per-request context variables available throughout the Hono app.
 *
 * `user` and `session` are populated by the auth middleware; they are present
 * on any route mounted behind it. Public routes simply never read them.
 * App-wide dependencies (pools, config, Better Auth) are not context
 * variables: createApp hands them to the route factories as services.
 */
export type AppContext = {
  Variables: {
    logger: Logger;
    user: AuthContext;
    session: AuthSession;
  };
};
