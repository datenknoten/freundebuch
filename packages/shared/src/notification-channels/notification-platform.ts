import { type } from 'arktype';

export const NOTIFICATION_PLATFORMS = ['telegram', 'matrix', 'discord'] as const;

export const NotificationPlatformSchema = type.enumerated(...NOTIFICATION_PLATFORMS);

export type NotificationPlatform = (typeof NOTIFICATION_PLATFORMS)[number];
