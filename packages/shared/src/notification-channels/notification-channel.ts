import type { NotificationCredentials } from './notification-credentials.js';
import type { NotificationPlatform } from './notification-platform.js';

export interface NotificationChannel {
  externalId: string;
  platform: NotificationPlatform;
  isEnabled: boolean;
  lookaheadDays: number;
  notifyTime: string; // "HH:MM" 24-hour format
  credentials: NotificationCredentials;
  createdAt: string; // ISO 8601
  updatedAt: string;
}
