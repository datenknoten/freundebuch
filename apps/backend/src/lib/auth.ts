import { passkey } from '@better-auth/passkey';
import bcrypt from 'bcrypt';
import { betterAuth } from 'better-auth';
import { mcp } from 'better-auth/plugins';
import { Pool } from 'pg';
import { createLegacyUserForBetterAuth } from '../models/queries/users.queries.js';
import { getConfig } from '../utils/config.js';

// Better Auth's Auth<T> generic is invariant, so Auth<SpecificOptions> cannot
// be assigned to Auth<BetterAuthOptions>. ReturnType inference also fails due
// to a non-portable @simplewebauthn/server transitive type reference.
// biome-ignore lint/suspicious/noExplicitAny: Auth<T> is invariant; ReturnType inference fails due to @simplewebauthn/server transitive type
let _auth: any = null;
let _authPool: Pool | null = null;

function createAuth() {
  const config = getConfig();

  // Public origin of this deployment. In production every surface (SPA, /api,
  // /mcp) is served from the same host behind nginx, so the OAuth issuer and the
  // MCP `resource` audience share that origin. Prefer BETTER_AUTH_URL (which
  // Better Auth also reads from process.env for its issuer); fall back to
  // FRONTEND_URL, which equals the public origin in production.
  const publicBaseUrl = config.BETTER_AUTH_URL ?? config.FRONTEND_URL;

  // Better Auth requires search_path=auth, so it needs its own pool.
  // Pool sizes are halved from the main pool to keep total connections in check.
  _authPool = new Pool({
    connectionString: config.DATABASE_URL,
    options: '-c search_path=auth',
    min: Math.max(1, Math.floor(config.DATABASE_POOL_MIN / 2)),
    max: Math.max(2, Math.floor(config.DATABASE_POOL_MAX / 2)),
  });

  return betterAuth({
    database: _authPool,
    basePath: '/api/auth',
    // The public origin where auth is reachable. Required for the OAuth/MCP
    // provider: the discovery metadata's `issuer` is derived from it, and the
    // provider throws `invalid_issuer` when unset. In every environment the
    // browser talks to auth via the frontend origin, so FRONTEND_URL is the
    // correct fallback when BETTER_AUTH_URL is not explicitly set.
    baseURL: publicBaseUrl,
    secret: config.BETTER_AUTH_SECRET,
    logger: {
      disabled: process.env.VITEST === 'true',
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      password: {
        // Custom verify to support both bcrypt (legacy) and scrypt (Better Auth default)
        verify: async ({ hash, password }) => {
          // bcrypt hashes start with $2b$ or $2a$
          if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
            try {
              return await bcrypt.compare(password, hash);
            } catch {
              return false;
            }
          }
          // For scrypt hashes (Better Auth default for new passwords),
          // use Better Auth's built-in verification
          try {
            const { verifyPassword } = await import('better-auth/crypto');
            return await verifyPassword({ hash, password });
          } catch {
            return false;
          }
        },
      },
      sendResetPassword: async ({ user, url }, _request) => {
        const logger = (await import('../utils/logger.js')).createLogger();
        logger.info({ userId: user.id }, 'Password reset requested');
        // Only log the reset URL in non-production environments
        if (config.ENV !== 'production') {
          logger.debug({ resetUrl: url }, 'Reset URL (dev only)');
        }
      },
    },
    account: {
      fields: {
        accountId: 'account_id',
        providerId: 'provider_id',
        userId: 'user_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60, // 7 days
      updateAge: 24 * 60 * 60, // Refresh session every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5-minute cache
      },
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        userId: 'user_id',
      },
    },
    user: {
      additionalFields: {
        selfProfileId: {
          type: 'number',
          required: false,
          input: false,
          fieldName: 'self_profile_id',
        },
        preferences: {
          type: 'string',
          required: false,
          input: false,
          fieldName: 'preferences',
        },
      },
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    verification: {
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    plugins: [
      passkey({
        rpID: config.WEBAUTHN_RP_ID ?? 'localhost',
        rpName: 'Freundebuch',
        origin: config.FRONTEND_URL,
        schema: {
          passkey: {
            fields: {
              publicKey: 'public_key',
              userId: 'user_id',
              credentialID: 'credential_id',
              deviceType: 'device_type',
              backedUp: 'backed_up',
              createdAt: 'created_at',
            },
          },
        },
      }),
      // OAuth 2.1 authorization server for the MCP server, so clients like
      // claude.ai can connect via the MCP Authorization spec (OAuth + PKCE +
      // Dynamic Client Registration). Endpoints are exposed under
      // /api/auth/oauth2/* and the discovery metadata under
      // /api/auth/.well-known/*. Token validation happens in the mcp-server via
      // getMcpSession against the shared `auth` schema.
      mcp({
        // Unauthenticated authorize requests are sent here; the login form then
        // redirects back to the original authorize URL (see login-form.svelte).
        loginPage: '/auth/login',
        // RFC 9728 resource audience — the MCP endpoint's public URL.
        resource: `${publicBaseUrl}/mcp`,
        oidcConfig: {
          // The mcp plugin injects `loginPage` from the top-level option, but
          // OIDCOptions requires it at the type level — keep them in sync.
          loginPage: '/auth/login',
          // claude.ai registers itself dynamically (its Client ID field is
          // optional), so DCR is the primary path.
          allowDynamicClientRegistration: true,
          // OAuth 2.1 requires PKCE.
          requirePKCE: true,
          // Custom consent screen (SvelteKit route).
          consentPage: '/oauth/consent',
          // The oidc-provider tables default to camelCase model/column names;
          // map them to the snake_case tables created by the migration so the
          // plugin reads/writes the right columns (mirrors the account/session
          // field overrides above).
          schema: {
            oauthApplication: {
              modelName: 'oauth_application',
              fields: {
                clientId: 'client_id',
                clientSecret: 'client_secret',
                redirectUrls: 'redirect_urls',
                userId: 'user_id',
                createdAt: 'created_at',
                updatedAt: 'updated_at',
              },
            },
            oauthAccessToken: {
              modelName: 'oauth_access_token',
              fields: {
                accessToken: 'access_token',
                refreshToken: 'refresh_token',
                accessTokenExpiresAt: 'access_token_expires_at',
                refreshTokenExpiresAt: 'refresh_token_expires_at',
                clientId: 'client_id',
                userId: 'user_id',
                createdAt: 'created_at',
                updatedAt: 'updated_at',
              },
            },
            oauthConsent: {
              modelName: 'oauth_consent',
              fields: {
                clientId: 'client_id',
                userId: 'user_id',
                consentGiven: 'consent_given',
                createdAt: 'created_at',
                updatedAt: 'updated_at',
              },
            },
          },
        },
      }),
    ],
    trustedOrigins: [config.FRONTEND_URL],
    rateLimit: {
      window: 60,
      max: process.env.VITEST === 'true' ? 1000 : 5,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            // Keep legacy auth.users in sync during transition period.
            // friends.friends.user_id is an integer FK to auth.users.id,
            // so new sign-ups need a legacy row until the FK is migrated.
            await createLegacyUserForBetterAuth.run({ email: user.email }, _authPool!);
          },
        },
      },
    },
  });
}

export function getAuth() {
  if (!_auth) {
    _auth = createAuth();
  }
  return _auth;
}

/**
 * Look up a registered OAuth client's display name (and icon) by its client_id.
 *
 * Reads the `auth.oauth_application` table the `mcp` plugin populates during
 * Dynamic Client Registration. The consent screen uses this to show a friendly
 * client name (e.g. "Claude") instead of the opaque, generated client id.
 *
 * The `mcp` plugin does not surface the oidc-provider's `/oauth2/client/:id`
 * endpoint — it only re-exports the consent endpoint — so the lookup lives here
 * against the same table. `_authPool` runs with `search_path=auth`, so the
 * unqualified `oauth_application` resolves to `auth.oauth_application`.
 *
 * Returns null when no client matches.
 */
export async function getOAuthClientInfo(
  clientId: string,
): Promise<{ name: string; icon: string | null } | null> {
  // Ensure the auth instance (and its pool) is initialized.
  getAuth();
  if (!_authPool) return null;

  const { rows } = await _authPool.query<{ name: string; icon: string | null }>(
    'SELECT name, icon FROM oauth_application WHERE client_id = $1 LIMIT 1',
    [clientId],
  );
  const row = rows[0];
  return row ? { name: row.name, icon: row.icon ?? null } : null;
}

/**
 * Drain the auth pool and clear the singleton.
 * Must be called before stopping the database (e.g. in test teardown).
 */
export async function resetAuth(): Promise<void> {
  if (_authPool) {
    await _authPool.end();
    _authPool = null;
  }
  _auth = null;
}
