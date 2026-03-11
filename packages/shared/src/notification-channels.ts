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
