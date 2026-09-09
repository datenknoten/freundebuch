import { passkey } from '@better-auth/passkey';
import bcrypt from 'bcrypt';
import { betterAuth } from 'better-auth';
import { mcp } from 'better-auth/plugins';
import { Pool } from 'pg';
import { createMailer, isMailConfigured } from '../services/mailer.js';
import { getConfig } from '../utils/config.js';
import { ConfigurationError, toError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';

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
    connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: config.DATABASE_IDLE_TIMEOUT_MS,
    statement_timeout: config.DATABASE_STATEMENT_TIMEOUT_MS,
    query_timeout: config.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  // Without an 'error' listener, an idle-client error (DB restart, network
  // blip) is emitted as an unhandled 'error' event and crashes the process.
  const poolLogger = createLogger();
  _authPool.on('error', (err) => {
    poolLogger.error({ err: toError(err) }, 'Idle pg client error');
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
      // Belt and braces behind the route-level gate in routes/auth.ts.
      disableSignUp: config.DISABLE_SIGNUP,
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
        const mailer = createMailer(config, logger);
        if (mailer === null) {
          logger.warn({ kind: 'password-reset' }, 'SMTP not configured; email not sent');
          // Only log the reset URL in non-production environments
          if (config.ENV !== 'production') {
            logger.debug({ resetUrl: url }, 'Reset URL (dev only)');
          }
          return;
        }
        try {
          await mailer.send(
            user.email,
            'Passwort zurücksetzen / Reset your password',
            [
              'Setze dein Freundebuch-Passwort über diesen Link zurück:',
              url,
              '',
              'Reset your Freundebuch password with this link:',
              url,
              '',
              'Wenn du das nicht angefordert hast, ignoriere diese E-Mail.',
              'If you did not request this, ignore this email.',
            ].join('\n'),
          );
        } catch (error) {
          // Swallow: Better Auth answers "forget password" generically so the
          // endpoint cannot be used to probe which addresses exist. A delivery
          // failure is an operator problem, not a caller problem.
          logger.error({ err: error, kind: 'password-reset' }, 'Failed to send reset email');
        }
      },
    },
    // Verification mail is only offered when SMTP exists; requireEmailVerification
    // stays off deliberately — turning it on would lock out every account that
    // signed up while this instance had no mailer (all of them, historically).
    emailVerification: {
      sendOnSignUp: isMailConfigured(config),
      sendVerificationEmail: async ({ user, url }, _request) => {
        const logger = (await import('../utils/logger.js')).createLogger();
        const mailer = createMailer(config, logger);
        if (mailer === null) {
          logger.warn({ kind: 'email-verification' }, 'SMTP not configured; email not sent');
          if (config.ENV !== 'production') {
            logger.debug({ verificationUrl: url }, 'Verification URL (dev only)');
          }
          return;
        }
        try {
          await mailer.send(
            user.email,
            'E-Mail-Adresse bestätigen / Confirm your email address',
            [
              'Bestätige deine E-Mail-Adresse für Freundebuch:',
              url,
              '',
              'Confirm your email address for Freundebuch:',
              url,
            ].join('\n'),
          );
        } catch (error) {
          logger.error(
            { err: error, kind: 'email-verification' },
            'Failed to send verification email',
          );
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
      // Email is the account's only human-readable identifier and it is
      // mirrored nowhere else now, but a change still needs the verified
      // two-step flow before it can be enabled.
      changeEmail: {
        enabled: false,
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
          // Allocate the legacy row first and adopt its UUID as the Better
          // Auth user id, so `auth."user".id = auth.users.external_id` holds
          // from the first write. Better Auth merges `data` from `before` into
          // the create payload and inserts with forceAllowId (see
          // better-auth/dist/db/with-hooks.mjs).
          //
          // Raw pool.query rather than PgTyped: the auth pool runs with
          // search_path=auth while the generated queries assume the main pool's
          // default search_path.
          before: async () => {
            const {
              rows: [row],
            } = await _authPool!.query<{ external_id: string }>(
              'INSERT INTO auth.users DEFAULT VALUES RETURNING external_id',
            );
            if (!row) {
              throw new Error('Failed to allocate legacy user row');
            }
            return { data: { id: row.external_id } };
          },
        },
        delete: {
          // auth.users is the FK anchor for every domain table, so dropping it
          // cascades the user's friends, encounters and collectives. There is
          // no DB-level FK between the two identity tables to do this for us.
          after: async (user: { id: string }) => {
            await _authPool!.query('DELETE FROM auth.users WHERE external_id = $1::uuid', [
              user.id,
            ]);
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
 * The Better Auth pool (search_path=auth). Better Auth owns its own pool, so
 * the readiness probe has to check it separately from the main pool: the main
 * pool can be fine while auth queries fail.
 */
export function getAuthPool(): Pool {
  if (!_authPool) {
    // Creating the auth instance is what builds the pool.
    getAuth();
  }
  if (!_authPool) {
    throw new ConfigurationError('Better Auth pool is not initialised');
  }
  return _authPool;
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
