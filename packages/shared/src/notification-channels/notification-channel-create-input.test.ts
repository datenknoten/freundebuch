import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { NotificationChannelCreateInputSchema } from './notification-channel-create-input.js';

const VALID = { platform: 'telegram', credentials: { botToken: 't', chatId: 'c' } };

describe('NotificationChannelCreateInputSchema', () => {
  describe('with the minimal fields', () => {
    it('accepts a platform and a credentials object', () => {
      expect(NotificationChannelCreateInputSchema(VALID)).toEqual(VALID);
    });
  });

  describe('with lookaheadDays', () => {
    it.each([1, 30])('accepts the boundary %i', (lookaheadDays) => {
      expect(NotificationChannelCreateInputSchema({ ...VALID, lookaheadDays })).not.toBeInstanceOf(
        type.errors,
      );
    });

    it.each([0, 31, 1.5])('rejects %s', (lookaheadDays) => {
      expect(NotificationChannelCreateInputSchema({ ...VALID, lookaheadDays })).toBeInstanceOf(
        type.errors,
      );
    });
  });

  describe('with notifyTime', () => {
    it.each(['00:00', '23:59'])('accepts %s', (notifyTime) => {
      expect(NotificationChannelCreateInputSchema({ ...VALID, notifyTime })).not.toBeInstanceOf(
        type.errors,
      );
    });

    it.each(['24:00', '9:00', '12:60'])('rejects %s', (notifyTime) => {
      expect(NotificationChannelCreateInputSchema({ ...VALID, notifyTime })).toBeInstanceOf(
        type.errors,
      );
    });
  });

  describe('with an invalid platform or credentials', () => {
    it('rejects an unknown platform', () => {
      expect(NotificationChannelCreateInputSchema({ ...VALID, platform: 'slack' })).toBeInstanceOf(
        type.errors,
      );
    });

    it('rejects a missing credentials object', () => {
      expect(NotificationChannelCreateInputSchema({ platform: 'matrix' })).toBeInstanceOf(
        type.errors,
      );
    });
  });
});
