import { type } from 'arktype';

export const TelegramCredentialsSchema = type({
  botToken: 'string > 0',
  chatId: 'string > 0',
});

/** Partial because tokens are never returned to the client. */
export const TelegramCredentialsUpdateSchema = type({
  'botToken?': 'string > 0',
  'chatId?': 'string > 0',
});
