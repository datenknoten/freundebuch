import { type } from 'arktype';

/**
 * Notification channel types for messaging bot configurations
 */

// ============================================================================
// Platform Type
// ============================================================================

export type NotificationPlatform = 'telegram' | 'matrix' | 'discord';

// ============================================================================
// Credential Types
// ============================================================================

export interface NotificationCredentials {
  // Telegram
  botToken?: string;
  chatId?: string;
  // Matrix
  homeserver?: string;
  accessToken?: string;
  roomId?: string;
  // Discord
  webhookUrl?: string;
}

// ============================================================================
// Channel Type
// ============================================================================

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

// ============================================================================
// Input Types
// ============================================================================

export interface NotificationChannelCreateInput {
  platform: NotificationPlatform;
  isEnabled?: boolean;
  lookaheadDays?: number;
  notifyTime?: string;
  credentials: NotificationCredentials;
}

export interface NotificationChannelUpdateInput {
  isEnabled?: boolean;
  lookaheadDays?: number;
  notifyTime?: string;
  credentials?: NotificationCredentials;
}

// ============================================================================
// Input Schemas
// ============================================================================

/** Schema for creating a notification channel (top-level shape) */
export const NotificationChannelCreateSchema = type({
  platform: '"telegram" | "matrix" | "discord"',
  'isEnabled?': 'boolean',
  'lookaheadDays?': 'number.integer >= 1 & number.integer <= 30',
  'notifyTime?': /^([01]\d|2[0-3]):[0-5]\d$/,
  credentials: 'object',
});

/** Schema for updating a notification channel (top-level shape) */
export const NotificationChannelUpdateSchema = type({
  'isEnabled?': 'boolean',
  'lookaheadDays?': 'number.integer >= 1 & number.integer <= 30',
  'notifyTime?': /^([01]\d|2[0-3]):[0-5]\d$/,
  'credentials?': 'object',
});

/** Schema for enabling/disabling a channel */
export const NotificationChannelToggleSchema = type({
  isEnabled: 'boolean',
});

// ============================================================================
// Credential Schemas
// ============================================================================

/** Telegram credentials for channel creation (all fields required) */
export const TelegramCredentialsSchema = type({
  botToken: 'string > 0',
  chatId: 'string > 0',
});

/** Telegram credentials for channel updates (tokens are never returned, so partial) */
export const TelegramCredentialsUpdateSchema = type({
  'botToken?': 'string > 0',
  'chatId?': 'string > 0',
});

/**
 * Matrix credentials for channel creation (all fields required).
 *
 * `homeserver` is https-only, matching `sendMatrixMessage`, which rejects any
 * other protocol as part of its SSRF guard. Accepting `http://` here let a
 * channel be created and persisted that could never deliver: nothing
 * validates the URL on the create path, so the failure only surfaced later,
 * once per day, in the digest scheduler.
 */
export const MatrixCredentialsSchema = type({
  homeserver: /^https:\/\/.+/,
  accessToken: 'string > 0',
  roomId: /^!.+:.+/,
});

/** Matrix credentials for channel updates */
export const MatrixCredentialsUpdateSchema = type({
  'homeserver?': /^https:\/\/.+/,
  'accessToken?': 'string > 0',
  'roomId?': /^!.+:.+/,
});

/** Discord credentials for channel creation */
export const DiscordCredentialsSchema = type({
  webhookUrl: /^https:\/\/discord(app)?\.com\/api\/webhooks\/.+\/.+/,
});

/** Discord credentials for channel updates */
export const DiscordCredentialsUpdateSchema = type({
  'webhookUrl?': /^https:\/\/discord(app)?\.com\/api\/webhooks\/.+\/.+/,
});
