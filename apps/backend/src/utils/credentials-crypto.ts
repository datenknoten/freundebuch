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
 * Envelope: `enc:v1:<iv>:<tag>:<ciphertext>`, all three parts base64url.
 * The version segment exists so a future key or cipher change can be told
 * apart from `v1` rows instead of guessing.
 *
 * Rotating `BETTER_AUTH_SECRET` makes stored credentials undecryptable — see
 * `docs/self-hosting.md`.
 */

const ENVELOPE_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const HKDF_SALT = 'freundebuch';
const HKDF_INFO = 'notification-credentials';

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

/** True when the value already carries the encryption envelope. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENVELOPE_PREFIX);
}

/** SQL `LIKE` pattern matching encrypted values, for backfill queries. */
const ENCRYPTED_LIKE_PATTERN = `${ENVELOPE_PREFIX}%`;

export function encrypt(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const parts = [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ];
  return `${ENVELOPE_PREFIX}${parts.join(':')}`;
}

/**
 * Decrypt an envelope. Values without the envelope are returned unchanged:
 * rows written before encryption existed are plaintext and stay readable
 * until the startup backfill (or the next write) converts them.
 *
 * Throws when the envelope is present but cannot be authenticated — a wrong
 * key or a tampered value must not silently degrade to garbage.
 */
export function decrypt(value: string): string {
  if (!isEncrypted(value)) {
    return value;
  }

  const parts = value.slice(ENVELOPE_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new ConfigurationError('Malformed encrypted credential envelope', {
      code: 'CREDENTIAL_DECRYPT_FAILED',
    });
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(parts[0], 'base64url'));
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
export function tryDecrypt(value: string): string | null {
  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

/**
 * Encrypt a nullable credential for a write path. Already-encrypted input is
 * passed through so a backfill or re-save never double-wraps.
 */
export function encryptOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return isEncrypted(value) ? value : encrypt(value);
}

interface LegacyCredentialRow {
  id: string | number;
  telegram_bot_token: string | null;
  matrix_access_token: string | null;
  discord_webhook_url: string | null;
}

/**
 * Encrypt notification-channel credentials written before this module existed.
 *
 * Idempotent: rows already carrying the envelope are not selected, and any
 * column that is already encrypted is passed through untouched. Returns the
 * number of rows converted.
 */
export async function encryptLegacyNotificationCredentials(
  db: pg.Pool,
  logger: Logger,
): Promise<number> {
  const { rows } = await db.query<LegacyCredentialRow>(
    `SELECT id, telegram_bot_token, matrix_access_token, discord_webhook_url
       FROM system.notification_channels
      WHERE (telegram_bot_token IS NOT NULL AND telegram_bot_token NOT LIKE $1)
         OR (matrix_access_token IS NOT NULL AND matrix_access_token NOT LIKE $1)
         OR (discord_webhook_url IS NOT NULL AND discord_webhook_url NOT LIKE $1)`,
    [ENCRYPTED_LIKE_PATTERN],
  );

  for (const row of rows) {
    await db.query(
      `UPDATE system.notification_channels
          SET telegram_bot_token = $2, matrix_access_token = $3, discord_webhook_url = $4
        WHERE id = $1`,
      [
        row.id,
        encryptOptional(row.telegram_bot_token),
        encryptOptional(row.matrix_access_token),
        encryptOptional(row.discord_webhook_url),
      ],
    );
  }

  if (rows.length > 0) {
    logger.info(
      { count: rows.length },
      'Encrypted legacy notification channel credentials at rest',
    );
  }

  return rows.length;
}
