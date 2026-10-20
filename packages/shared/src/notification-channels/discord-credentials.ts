import { type } from 'arktype';

export const DiscordCredentialsSchema = type({
  webhookUrl: /^https:\/\/discord(app)?\.com\/api\/webhooks\/.+\/.+/,
});

export const DiscordCredentialsUpdateSchema = type({
  'webhookUrl?': /^https:\/\/discord(app)?\.com\/api\/webhooks\/.+\/.+/,
});
