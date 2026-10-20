import { type } from 'arktype';
import { NotificationCredentialsSchema } from './notification-credentials.js';
import { NotificationPlatformSchema } from './notification-platform.js';

export const NotificationChannelResponseSchema = type({
  externalId: 'string',
  platform: NotificationPlatformSchema,
  isEnabled: 'boolean',
  lookaheadDays: 'number',
  /** "HH:MM", 24-hour */
  notifyTime: 'string',
  credentials: NotificationCredentialsSchema,
  /** ISO 8601 */
  createdAt: 'string',
  /** ISO 8601 */
  updatedAt: 'string',
});

export type NotificationChannelResponse = typeof NotificationChannelResponseSchema.infer;
