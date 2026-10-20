import { type } from 'arktype';

/** Discord credentials for channel creation */
export const DiscordCredentialsSchema = type({
  webhookUrl: /^https:\/\/discord(app)?\.com\/api\/webhooks\/.+\/.+/,
});

/** Discord credentials for channel updates */
export const DiscordCredentialsUpdateSchema = type({
  'webhookUrl?': /^https:\/\/discord(app)?\.com\/api\/webhooks\/.+\/.+/,
});
