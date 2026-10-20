import { type } from 'arktype';
import { NotificationPlatformSchema } from './notification-platform.js';

/** The top-level shape; the route validates `credentials` against the platform's schema. */
export const NotificationChannelCreateInputSchema = type({
  platform: NotificationPlatformSchema,
  'isEnabled?': 'boolean',
  'lookaheadDays?': 'number.integer >= 1 & number.integer <= 30',
  'notifyTime?': /^([01]\d|2[0-3]):[0-5]\d$/,
  credentials: 'object',
});

export type NotificationChannelCreateInput = typeof NotificationChannelCreateInputSchema.infer;
