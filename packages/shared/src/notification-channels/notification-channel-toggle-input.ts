import { type } from 'arktype';

export const NotificationChannelToggleInputSchema = type({
  isEnabled: 'boolean',
});

export type NotificationChannelToggleInput = typeof NotificationChannelToggleInputSchema.infer;
