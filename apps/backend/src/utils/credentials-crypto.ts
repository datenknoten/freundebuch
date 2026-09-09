import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import type pg from 'pg';
import type { Logger } from 'pino';
import { getConfig } from './config.js';
import { ConfigurationError } from './errors.js';

/**
 * Encryption of third-party credentials at rest.
 *
 * Notification channels store bot tokens and webhook URLs that let the holder
 * post as the user, so a database dump must not be enough to use them. Values
 * are wrapped in an AES-256-GCM envelope keyed by a value that only lives in
 * the environment (`BETTER_AUTH_SECRET`), never in the database.
 *
 * Envelope: `enc:v2:<iv>:<tag>:<ciphertext>`, all three parts base64url. v2
 * additionally authenticates a context string (`credentialContext`) as GCM
 * associated data, binding every ciphertext to one user and one column: an
 * attacker with write access to the database cannot move a working credential
 * onto another account or into another column, because the tag no longer
 * verifies. `enc:v1:` rows carry no such binding and are still readable; every
 * write upgrades them.
 *
 * Rotating `BETTER_AUTH_SECRET` makes stored credentials undecryptable — see
 * `docs/self-hosting.md`.
 */

const ENVELOPE_PREFIX_V1 = 'enc:v1:';
const ENVELOPE_PREFIX_V2 = 'enc:v2:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const HKDF_SALT = 'freundebuch';
const HKDF_INFO = 'notification-credentials';

/** The columns holding a credential; part of the authenticated context. */
export type CredentialColumn = 'telegram_bot_token' | 'matrix_access_token' | 'discord_webhook_url';

/**
 * The associated data a v2 ciphertext is bound to. Changing the shape of this
 * string invalidates every stored credential, so it is deliberately boring.
 */
export function credentialContext(userExternalId: string, column: CredentialColumn): string {
  return `notification-channel:${userExternalId}:${column}`;
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey === null) {
    const secret = getConfig().BETTER_AUTH_SECRET;
    cachedKey = Buffer.from(hkdfSync('sha256', secret, HKDF_SALT, HKDF_INFO, KEY_BYTES));
  }
  return cachedKey;
}

/**
 * Drop the derived key so the next call re-derives it from the current
 * configuration. Only needed by tests that swap `BETTER_AUTH_SECRET`.
 */
export function resetCredentialsKey(): void {
  cachedKey = null;
}

/** True when the value already carries an encryption envelope. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENVELOPE_PREFIX_V1) || value.startsWith(ENVELOPE_PREFIX_V2);
}

/** SQL `LIKE` pattern matching current-envelope values, for backfill queries. */
const ENCRYPTED_V2_LIKE_PATTERN = `${ENVELOPE_PREFIX_V2}%`;

export function encrypt(plain: string, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const parts = [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ];
  return `${ENVELOPE_PREFIX_V2}${parts.join(':')}`;
}

/**
 * Decrypt an envelope. Values without the envelope are returned unchanged:
 * rows written before encryption existed are plaintext and stay readable
 * until the startup backfill (or the next write) converts them.
 *
 * Throws when the envelope is present but cannot be authenticated — a wrong
 * key, a tampered value, or a v2 ciphertext presented under the wrong context
 * must not silently degrade to garbage.
 */
export function decrypt(value: string, context: string): string {
  const isV2 = value.startsWith(ENVELOPE_PREFIX_V2);
  if (!isV2 && !value.startsWith(ENVELOPE_PREFIX_V1)) {
    return value;
  }

  const parts = value.slice(ENVELOPE_PREFIX_V2.length).split(':');
  if (parts.length !== 3) {
    throw new ConfigurationError('Malformed encrypted credential envelope', {
      code: 'CREDENTIAL_DECRYPT_FAILED',
    });
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(parts[0], 'base64url'));
    // v1 was written without associated data; setting it there would fail the
    // tag check on every legacy row.
    if (isV2) {
      decipher.setAAD(Buffer.from(context, 'utf8'));
    }
    decipher.setAuthTag(Buffer.from(parts[1], 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(parts[2], 'base64url')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  } catch {
    throw new ConfigurationError(
      'Stored credential could not be decrypted; re-enter the channel credentials',
      { code: 'CREDENTIAL_DECRYPT_FAILED' },
    );
  }
}

/**
 * Decrypt without throwing, for read paths that only need a display hint and
 * must keep working after a secret rotation (so the user can re-enter the
 * credential through the UI).
 */
export function tryDecrypt(value: string, context: string): string | null {
  try {
    return decrypt(value, context);
  } catch {
    return null;
  }
}

/**
 * Encrypt a nullable credential for a write path. A value that is already a v2
 * envelope is passed through so a re-save never double-wraps; a v1 envelope is
 * re-wrapped so it gains the context binding.
 */
export function encryptOptional(value: string | null | undefined, context: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value.startsWith(ENVELOPE_PREFIX_V2)) {
    return value;
  }
  return encrypt(decrypt(value, context), context);
}

interface LegacyCredentialRow {
  id: string | number;
  user_external_id: string;
  telegram_bot_token: string | null;
  matrix_access_token: string | null;
  discord_webhook_url: string | null;
}

/**
 * Bring notification-channel credentials up to the current envelope: plaintext
 * rows written before this module existed, and v1 rows written before the
 * context binding.
 *
 * Idempotent: rows already fully on v2 are not selected. A value that does not
 * decrypt (the secret was rotated) is left exactly as it is — rewriting it
 * would destroy the ciphertext the user might still recover, and the UI
 * already degrades to `****` until they re-enter it. Returns the number of
 * rows rewritten.
 */
export async function encryptLegacyNotificationCredentials(
  db: pg.Pool,
  logger: Logger,
): Promise<number> {
  const { rows } = await db.query<LegacyCredentialRow>(
    `SELECT nc.id,
            u.external_id AS user_external_id,
            nc.telegram_bot_token,
            nc.matrix_access_token,
            nc.discord_webhook_url
       FROM system.notification_channels nc
       INNER JOIN auth.users u ON nc.user_id = u.id
      WHERE (nc.telegram_bot_token IS NOT NULL AND nc.telegram_bot_token NOT LIKE $1)
         OR (nc.matrix_access_token IS NOT NULL AND nc.matrix_access_token NOT LIKE $1)
         OR (nc.discord_webhook_url IS NOT NULL AND nc.discord_webhook_url NOT LIKE $1)`,
    [ENCRYPTED_V2_LIKE_PATTERN],
  );

  let rewritten = 0;

  for (const row of rows) {
    let changed = false;

    const upgrade = (value: string | null, column: CredentialColumn): string | null => {
      if (value === null || value.startsWith(ENVELOPE_PREFIX_V2)) {
        return value;
      }
      const context = credentialContext(row.user_external_id, column);
      const plain = tryDecrypt(value, context);
      if (plain === null) {
        logger.warn(
          { channelId: row.id, column },
          'Credential could not be re-encrypted; user must re-enter it',
        );
        return value;
      }
      changed = true;
      return encrypt(plain, context);
    };

    const telegramBotToken = upgrade(row.telegram_bot_token, 'telegram_bot_token');
    const matrixAccessToken = upgrade(row.matrix_access_token, 'matrix_access_token');
    const discordWebhookUrl = upgrade(row.discord_webhook_url, 'discord_webhook_url');

    if (!changed) {
      continue;
    }

    await db.query(
      `UPDATE system.notification_channels
          SET telegram_bot_token = $2, matrix_access_token = $3, discord_webhook_url = $4
        WHERE id = $1`,
      [row.id, telegramBotToken, matrixAccessToken, discordWebhookUrl],
    );
    rewritten += 1;
  }

  if (rewritten > 0) {
    logger.info({ count: rewritten }, 'Encrypted legacy notification channel credentials at rest');
  }

  return rewritten;
}
