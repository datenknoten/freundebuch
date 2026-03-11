import type { NotificationChannel } from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import {
  createChannel,
  deleteChannel,
  getChannelByExternalId,
  getChannelsByUserId,
  type IGetChannelByExternalIdResult,
  type IGetChannelsByUserIdResult,
  updateChannel,
} from '../models/queries/notification-channels.queries.js';
import {
  NotificationChannelAlreadyExistsError,
  NotificationChannelNotFoundError,
  NotificationDeliveryError,
} from '../utils/errors.js';
import { sendDiscordMessage } from './external/discord.client.js';
import { sendMatrixMessage } from './external/matrix.client.js';
import { sendTelegramMessage } from './external/telegram.client.js';

type ChannelRow = IGetChannelsByUserIdResult | IGetChannelByExternalIdResult;

/**
 * Service for managing notification channels (messaging bot configurations)
 */
export class NotificationChannelsService {
  constructor(private db: Pool) {}

  /**
   * List all channels for a user (credentials masked)
   */
  async listChannels(userExternalId: string): Promise<{ data: NotificationChannel[] }> {
    const results = await getChannelsByUserId.run({ userExternalId }, this.db);
    return { data: results.map((row) => this.mapChannel(row)) };
  }

  /**
   * Get a single channel by external ID (credentials masked)
   */
  async getChannel(
    userExternalId: string,
    channelExternalId: string,
  ): Promise<{ data: NotificationChannel }> {
    const results = await getChannelByExternalId.run(
      { userExternalId, channelExternalId },
      this.db,
    );
    if (results.length === 0) {
      throw new NotificationChannelNotFoundError();
    }
    return { data: this.mapChannel(results[0]) };
  }

  /**
   * Create a new notification channel
   */
  async createChannel(
    userExternalId: string,
    input: {
      platform: string;
      isEnabled?: boolean;
      lookaheadDays?: number;
      notifyTime?: string;
      credentials: Record<string, string>;
    },
  ): Promise<{ data: NotificationChannel }> {
    try {
      const results = await createChannel.run(
        {
          userExternalId,
          platform: input.platform,
          isEnabled: input.isEnabled ?? true,
          telegramBotToken: input.credentials.botToken ?? null,
          telegramChatId: input.credentials.chatId ?? null,
          matrixHomeserver: input.credentials.homeserver ?? null,
          matrixAccessToken: input.credentials.accessToken ?? null,
          matrixRoomId: input.credentials.roomId ?? null,
          discordWebhookUrl: input.credentials.webhookUrl ?? null,
          lookaheadDays: input.lookaheadDays ?? null,
          notifyTime: input.notifyTime ?? null,
        },
        this.db,
      );

      if (results.length === 0) {
        throw new NotificationChannelNotFoundError('Failed to create notification channel');
      }

      return { data: this.mapChannel(results[0]) };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new NotificationChannelAlreadyExistsError(input.platform);
      }
      throw error;
    }
  }

  /**
   * Update an existing notification channel
   */
  async updateChannel(
    userExternalId: string,
    channelExternalId: string,
    input: {
      isEnabled?: boolean;
      lookaheadDays?: number;
      notifyTime?: string;
      credentials?: Record<string, string>;
    },
  ): Promise<{ data: NotificationChannel }> {
    const results = await updateChannel.run(
      {
        userExternalId,
        channelExternalId,
        isEnabled: input.isEnabled ?? null,
        telegramBotToken: input.credentials?.botToken ?? null,
        telegramChatId: input.credentials?.chatId ?? null,
        matrixHomeserver: input.credentials?.homeserver ?? null,
        matrixAccessToken: input.credentials?.accessToken ?? null,
        matrixRoomId: input.credentials?.roomId ?? null,
        discordWebhookUrl: input.credentials?.webhookUrl ?? null,
        lookaheadDays: input.lookaheadDays ?? null,
        notifyTime: input.notifyTime ?? null,
      },
      this.db,
    );

    if (results.length === 0) {
      throw new NotificationChannelNotFoundError();
    }

    return { data: this.mapChannel(results[0]) };
  }

  /**
   * Delete a notification channel
   */
  async deleteChannel(userExternalId: string, channelExternalId: string): Promise<boolean> {
    const results = await deleteChannel.run({ userExternalId, channelExternalId }, this.db);
    return results.length > 0;
  }

  /**
   * Toggle a channel's enabled/disabled state
   */
  async toggleChannel(
    userExternalId: string,
    channelExternalId: string,
    isEnabled: boolean,
  ): Promise<{ data: NotificationChannel }> {
    return this.updateChannel(userExternalId, channelExternalId, { isEnabled });
  }

  /**
   * Send a test message to verify channel configuration
   */
  async sendTestMessage(userExternalId: string, channelExternalId: string): Promise<void> {
    const results = await getChannelByExternalId.run(
      { userExternalId, channelExternalId },
      this.db,
    );
    if (results.length === 0) {
      throw new NotificationChannelNotFoundError();
    }

    const channel = results[0];
    const testMessage = 'Freundebuch - Test notification. Your channel is configured correctly!';
    const testHtml =
      '<b>Freundebuch</b> - Test notification. Your channel is configured correctly!';

    switch (channel.platform) {
      case 'telegram':
        await sendTelegramMessage(
          channel.telegram_bot_token ?? '',
          channel.telegram_chat_id ?? '',
          testMessage,
        );
        break;
      case 'matrix':
        await sendMatrixMessage(
          channel.matrix_homeserver ?? '',
          channel.matrix_access_token ?? '',
          channel.matrix_room_id ?? '',
          testMessage,
          testHtml,
        );
        break;
      case 'discord':
        await sendDiscordMessage(channel.discord_webhook_url ?? '', testMessage);
        break;
      default:
        throw new NotificationDeliveryError(channel.platform, 'Unknown platform');
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapChannel(row: ChannelRow): NotificationChannel {
    const credentials: NotificationChannel['credentials'] = {};

    switch (row.platform) {
      case 'telegram':
        credentials.botToken = this.maskSecret(row.telegram_bot_token);
        credentials.chatId = row.telegram_chat_id ?? undefined;
        break;
      case 'matrix':
        credentials.homeserver = row.matrix_homeserver ?? undefined;
        credentials.accessToken = this.maskSecret(row.matrix_access_token);
        credentials.roomId = row.matrix_room_id ?? undefined;
        break;
      case 'discord':
        credentials.webhookUrl = this.maskSecret(row.discord_webhook_url);
        break;
    }

    // Format notify_time: stored as TIME, comes back as string "HH:MM:SS"
    const notifyTimeRaw = String(row.notify_time);
    const notifyTime = notifyTimeRaw.slice(0, 5); // "HH:MM"

    return {
      externalId: row.external_id,
      platform: row.platform as NotificationChannel['platform'],
      isEnabled: row.is_enabled,
      lookaheadDays: row.lookahead_days,
      notifyTime,
      credentials,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private maskSecret(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    if (value.length <= 4) return '****';
    return `...${value.slice(-4)}`;
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
