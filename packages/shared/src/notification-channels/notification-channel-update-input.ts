import { type } from 'arktype';

/** The top-level shape; the route validates `credentials` against the platform's schema. */
export const NotificationChannelUpdateInputSchema = type({
  'isEnabled?': 'boolean',
  'lookaheadDays?': 'number.integer >= 1 & number.integer <= 30',
  'notifyTime?': /^([01]\d|2[0-3]):[0-5]\d$/,
  'credentials?': 'object',
});

export type NotificationChannelUpdateInput = typeof NotificationChannelUpdateInputSchema.infer;
