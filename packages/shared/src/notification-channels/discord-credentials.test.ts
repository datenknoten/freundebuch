import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { DiscordCredentialsSchema, DiscordCredentialsUpdateSchema } from './discord-credentials.js';

describe('DiscordCredentialsSchema', () => {
  describe('with a Discord webhook URL', () => {
    it.each([
      'https://discord.com/api/webhooks/123/token',
      'https://discordapp.com/api/webhooks/123/token',
    ])('accepts %s', (webhookUrl) => {
      expect(DiscordCredentialsSchema({ webhookUrl })).toEqual({ webhookUrl });
    });
  });

  describe('with any other URL', () => {
    it.each([
      'http://discord.com/api/webhooks/123/token',
      'https://example.com/api/webhooks/123/token',
      'https://discord.com/api/webhooks/123',
    ])('rejects %s', (webhookUrl) => {
      expect(DiscordCredentialsSchema({ webhookUrl })).toBeInstanceOf(type.errors);
    });

    it('rejects credentials without a webhook URL', () => {
      expect(DiscordCredentialsSchema({})).toBeInstanceOf(type.errors);
    });
  });
});

describe('DiscordCredentialsUpdateSchema', () => {
  describe('without a webhook URL', () => {
    it('accepts an empty update', () => {
      expect(DiscordCredentialsUpdateSchema({})).toEqual({});
    });
  });
});
