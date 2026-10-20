import { type } from 'arktype';

/** Union of every platform's credential fields; which ones are set depends on the platform. */
export const NotificationCredentialsSchema = type({
  'botToken?': 'string',
  'chatId?': 'string',
  'homeserver?': 'string',
  'accessToken?': 'string',
  'roomId?': 'string',
  'webhookUrl?': 'string',
});

export type NotificationCredentials = typeof NotificationCredentialsSchema.infer;
