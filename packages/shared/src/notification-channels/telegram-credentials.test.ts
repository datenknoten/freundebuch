import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import {
  TelegramCredentialsSchema,
  TelegramCredentialsUpdateSchema,
} from './telegram-credentials.js';

describe('TelegramCredentialsSchema', () => {
  describe('with complete credentials', () => {
    it('accepts a bot token and chat id', () => {
      expect(TelegramCredentialsSchema({ botToken: '123:abc', chatId: '42' })).toEqual({
        botToken: '123:abc',
        chatId: '42',
      });
    });
  });

  describe('with a missing or empty field', () => {
    it('rejects credentials without a chat id', () => {
      expect(TelegramCredentialsSchema({ botToken: '123:abc' })).toBeInstanceOf(type.errors);
    });

    it('rejects an empty bot token', () => {
      expect(TelegramCredentialsSchema({ botToken: '', chatId: '42' })).toBeInstanceOf(type.errors);
    });
  });
});

describe('TelegramCredentialsUpdateSchema', () => {
  describe('with partial credentials', () => {
    it('accepts only a chat id', () => {
      expect(TelegramCredentialsUpdateSchema({ chatId: '42' })).toEqual({ chatId: '42' });
    });

    it('rejects an empty chat id', () => {
      expect(TelegramCredentialsUpdateSchema({ chatId: '' })).toBeInstanceOf(type.errors);
    });
  });
});
