import { type PreferencesResponse, UserPreferencesSchema } from '@freundebuch/shared/index.js';
import { Hono, type MiddlewareHandler } from 'hono';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { Auth } from '../lib/auth.js';
import { getAuthUser } from '../middleware/auth.js';
import type { OAuthClientsService } from '../services/oauth-clients.service.js';
import type { UsersService } from '../services/users.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';

export interface AuthRoutesOptions {
  auth: Auth;
  usersService: UsersService;
  oauthClientsService: OAuthClientsService;
  authMiddleware: MiddlewareHandler<AppContext>;
  passkeyListRateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createAuthRoutes(options: AuthRoutesOptions) {
  const {
    auth,
    usersService,
    oauthClientsService,
    authMiddleware,
    passkeyListRateLimitMiddleware,
  } = options;
  const app = new Hono<AppContext>();

  /**
   * Mount Better Auth handler for all standard auth endpoints.
   * Better Auth handles: sign-in/email, sign-up/email, sign-out,
   * forget-password, reset-password, get-session, etc.
   */
  app.on(['POST', 'GET'], '/*', async (c, next) => {
    // Check if this is a custom route we handle ourselves
    const path = new URL(c.req.url).pathname;
    const customPaths = [
      '/api/auth/me',
      '/api/auth/preferences',
      '/api/auth/passkey/list-user-passkeys',
    ];
    // Prefixes for custom routes with dynamic path segments.
    const customPrefixes = ['/api/auth/oauth2/client/'];
    if (customPaths.some((p) => path === p) || customPrefixes.some((p) => path.startsWith(p))) {
      return next();
    }

    // Registration gate for private instances. Better Auth's `disableSignUp`
    // answers 400; this gate runs first so the client gets the documented 403
    // SIGNUP_DISABLED. The gate is checked only for that one path, so every other
    // auth request stays a pure passthrough.
    if (path === '/api/auth/sign-up/email') {
      usersService.assertSignupAllowed();
    }

    // Delegate to Better Auth handler
    return auth.handler(c.req.raw);
  });

  /**
   * GET /api/auth/me
   * Get the current authenticated user with preferences.
   *
   * Reads the self-profile and preferences from the database rather than the
   * Better Auth session, whose cookie cache can be stale (see
   * UsersService.getMeWithPreferences).
   */
  app.get('/me', authMiddleware, async (c) => {
    return c.json(await usersService.getMeWithPreferences(getAuthUser(c)));
  });

  /**
   * PATCH /api/auth/preferences
   * Update user preferences
   */
  app.patch('/preferences', authMiddleware, async (c) => {
    const authUser = getAuthUser(c);

    const validated = await parseBody(c, UserPreferencesSchema);

    return c.json<PreferencesResponse>(
      await usersService.updatePreferences(authUser.userId, validated),
    );
  });

  /**
   * GET /api/auth/passkey/list-user-passkeys
   * List all passkeys for the authenticated user.
   *
   * Facade over Better Auth's internal API with a dedicated rate limit
   * (30 req/min) instead of the global auth rate limit (5 req/min),
   * since this read-only endpoint is called frequently by the UI.
   */
  app.get(
    '/passkey/list-user-passkeys',
    authMiddleware,
    passkeyListRateLimitMiddleware,
    async (c) => {
      const passkeys = await auth.api.listPasskeys({
        headers: c.req.raw.headers,
      });
      return c.json(passkeys);
    },
  );

  /**
   * GET /api/auth/oauth2/client/:id
   * Resolve a registered OAuth client's display name (and icon) by client_id.
   *
   * The /oauth/consent screen calls this so it can show a friendly client name
   * (e.g. "Claude") instead of the opaque, DCR-generated client id. The Better
   * Auth `mcp` plugin does not expose the oidc-provider's `/oauth2/client/:id`
   * endpoint (it only re-exports the consent endpoint), so we provide it here.
   *
   * Gated on a valid session: the consent flow only reaches the page after login,
   * and this prevents anonymous enumeration of registered clients. We don't use
   * authMiddleware because this read doesn't need the legacy-user bridge.
   */
  app.get('/oauth2/client/:id', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      throw new AuthenticationError('Unauthorized');
    }

    return c.json(await oauthClientsService.getClientDisplay(c.req.param('id')));
  });

  return app;
}
