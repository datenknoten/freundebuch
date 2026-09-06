import type { IGetEnabledChannelsDueAtResult } from '../../models/queries/notification-channels.queries.js';
import { decrypt } from '../../utils/credentials-crypto.js';
import { sendDiscordMessage } from './discord.client.js';
import { sendMatrixMessage } from './matrix.client.js';
import { sendTelegramMessage } from './telegram.client.js';

/**
 * Dispatch a notification message to the appropriate platform
 */
export async function dispatchNotification(
  channel: IGetEnabledChannelsDueAtResult,
  plainText: string,
  htmlText: string,
): Promise<void> {
  switch (channel.platform) {
    case 'telegram':
      await sendTelegramMessage(
        decrypt(channel.telegram_bot_token ?? ''),
        channel.telegram_chat_id ?? '',
        plainText,
      );
      break;
    case 'matrix':
      await sendMatrixMessage(
        channel.matrix_homeserver ?? '',
        decrypt(channel.matrix_access_token ?? ''),
        channel.matrix_room_id ?? '',
        plainText,
        htmlText,
      );
      break;
    case 'discord':
      await sendDiscordMessage(decrypt(channel.discord_webhook_url ?? ''), plainText);
      break;
  }
}
