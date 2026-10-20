import type pg from 'pg';
import type { Logger } from 'pino';
import { type CredentialColumn, credentialContext } from './credential-context.js';
import { ENVELOPE_PREFIX_V2 } from './credential-envelope.js';
import { encrypt } from './encrypt.js';
import { tryDecrypt } from './try-decrypt.js';

/** SQL `LIKE` pattern matching current-envelope values, for backfill queries. */
const ENCRYPTED_V2_LIKE_PATTERN = `${ENVELOPE_PREFIX_V2}%`;

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
  key: Buffer,
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
    let hasChanged = false;

    const upgrade = (value: string | null, column: CredentialColumn): string | null => {
      if (value === null || value.startsWith(ENVELOPE_PREFIX_V2)) {
        return value;
      }
      const context = credentialContext(row.user_external_id, column);
      const plain = tryDecrypt(value, context, key);
      if (plain === null) {
        logger.warn(
          { channelId: row.id, column },
          'Credential could not be re-encrypted; user must re-enter it',
        );
        return value;
      }
      hasChanged = true;
      return encrypt(plain, context, key);
    };

    const telegramBotToken = upgrade(row.telegram_bot_token, 'telegram_bot_token');
    const matrixAccessToken = upgrade(row.matrix_access_token, 'matrix_access_token');
    const discordWebhookUrl = upgrade(row.discord_webhook_url, 'discord_webhook_url');

    if (!hasChanged) {
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
