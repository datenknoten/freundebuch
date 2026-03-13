import { passkey } from '@better-auth/passkey';
import bcrypt from 'bcrypt';
import { betterAuth } from 'better-auth';
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
    secret: config.BETTER_AUTH_SECRET,
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
        logger.info({ userId: user.id, email: user.email }, 'Password reset requested');
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
