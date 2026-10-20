import { type } from 'arktype';

/** Schema for enabling/disabling a channel */
export const NotificationChannelToggleSchema = type({
  isEnabled: 'boolean',
});
