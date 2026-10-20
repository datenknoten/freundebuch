import { type } from 'arktype';
import type { NotificationCredentials } from './notification-credentials.js';

export interface NotificationChannelUpdateInput {
  isEnabled?: boolean;
  lookaheadDays?: number;
  notifyTime?: string;
  credentials?: NotificationCredentials;
}

/** Schema for updating a notification channel (top-level shape) */
export const NotificationChannelUpdateSchema = type({
  'isEnabled?': 'boolean',
  'lookaheadDays?': 'number.integer >= 1 & number.integer <= 30',
  'notifyTime?': /^([01]\d|2[0-3]):[0-5]\d$/,
  'credentials?': 'object',
});
