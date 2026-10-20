import { type } from 'arktype';

/** Telegram credentials for channel creation (all fields required) */
export const TelegramCredentialsSchema = type({
  botToken: 'string > 0',
  chatId: 'string > 0',
});

/** Telegram credentials for channel updates (tokens are never returned, so partial) */
export const TelegramCredentialsUpdateSchema = type({
  'botToken?': 'string > 0',
  'chatId?': 'string > 0',
});
