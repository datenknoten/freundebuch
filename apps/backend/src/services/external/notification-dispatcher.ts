import type { IGetEnabledChannelsDueAtResult } from '../../models/queries/notification-channels.queries.js';
import { credentialContext } from '../../utils/credential-context.js';
import { decrypt } from '../../utils/decrypt.js';
import { sendDiscordMessage } from './discord.client.js';
import { sendMatrixMessage } from './matrix.client.js';
import { sendTelegramMessage } from './telegram.client.js';

export async function dispatchNotification(
  channel: IGetEnabledChannelsDueAtResult,
  plainText: string,
  htmlText: string,
  credentialsKey: Buffer,
) {
  switch (channel.platform) {
    case 'telegram':
      await sendTelegramMessage(
        decrypt(
          channel.telegram_bot_token ?? '',
          credentialContext(channel.user_external_id, 'telegram_bot_token'),
          credentialsKey,
        ),
        channel.telegram_chat_id ?? '',
        plainText,
      );
      break;
    case 'matrix':
      await sendMatrixMessage(
        channel.matrix_homeserver ?? '',
        decrypt(
          channel.matrix_access_token ?? '',
          credentialContext(channel.user_external_id, 'matrix_access_token'),
          credentialsKey,
        ),
        channel.matrix_room_id ?? '',
        plainText,
        htmlText,
      );
      break;
    case 'discord':
      await sendDiscordMessage(
        decrypt(
          channel.discord_webhook_url ?? '',
          credentialContext(channel.user_external_id, 'discord_webhook_url'),
          credentialsKey,
        ),
        plainText,
      );
      break;
  }
}
