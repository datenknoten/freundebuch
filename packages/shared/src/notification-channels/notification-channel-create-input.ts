import { type } from 'arktype';
import type { NotificationCredentials } from './notification-credentials.js';
import type { NotificationPlatform } from './notification-platform.js';

export interface NotificationChannelCreateInput {
  platform: NotificationPlatform;
  isEnabled?: boolean;
  lookaheadDays?: number;
  notifyTime?: string;
  credentials: NotificationCredentials;
}

/** Schema for creating a notification channel (top-level shape) */
export const NotificationChannelCreateSchema = type({
  platform: '"telegram" | "matrix" | "discord"',
  'isEnabled?': 'boolean',
  'lookaheadDays?': 'number.integer >= 1 & number.integer <= 30',
  'notifyTime?': /^([01]\d|2[0-3]):[0-5]\d$/,
  credentials: 'object',
});
