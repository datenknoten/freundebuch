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
import { decrypt, encryptOptional, tryDecrypt } from '../utils/credentials-crypto.js';
import {
  NotificationChannelAlreadyExistsError,
  NotificationChannelNotFoundError,
  NotificationDeliveryError,
} from '../utils/errors.js';
import { rethrowUniqueViolation } from '../utils/pg-errors.js';
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
  async listChannels(userExternalId: string): Promise<NotificationChannel[]> {
    const results = await getChannelsByUserId.run({ userExternalId }, this.db);
    return results.map((row) => this.mapChannel(row));
  }

  /**
   * Get a single channel by external ID (credentials masked)
   */
  async getChannel(
    userExternalId: string,
    channelExternalId: string,
  ): Promise<NotificationChannel> {
    const results = await getChannelByExternalId.run(
      { userExternalId, channelExternalId },
      this.db,
    );
    if (results.length === 0) {
      throw new NotificationChannelNotFoundError();
    }
    return this.mapChannel(results[0]);
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
  ): Promise<NotificationChannel> {
    try {
      const results = await createChannel.run(
        {
          userExternalId,
          platform: input.platform,
          isEnabled: input.isEnabled ?? true,
          telegramBotToken: encryptOptional(input.credentials.botToken),
          telegramChatId: input.credentials.chatId ?? null,
          matrixHomeserver: input.credentials.homeserver ?? null,
          matrixAccessToken: encryptOptional(input.credentials.accessToken),
          matrixRoomId: input.credentials.roomId ?? null,
          discordWebhookUrl: encryptOptional(input.credentials.webhookUrl),
          lookaheadDays: input.lookaheadDays ?? null,
          notifyTime: input.notifyTime ?? null,
        },
        this.db,
      );

      if (results.length === 0) {
        throw new NotificationChannelNotFoundError('Failed to create notification channel');
      }

      return this.mapChannel(results[0]);
    } catch (error) {
      rethrowUniqueViolation(error, {
        uq_notification_channels_user_platform: () =>
          new NotificationChannelAlreadyExistsError(input.platform),
      });
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
  ): Promise<NotificationChannel> {
    const results = await updateChannel.run(
      {
        userExternalId,
        channelExternalId,
        isEnabled: input.isEnabled ?? null,
        telegramBotToken: encryptOptional(input.credentials?.botToken),
        telegramChatId: input.credentials?.chatId ?? null,
        matrixHomeserver: input.credentials?.homeserver ?? null,
        matrixAccessToken: encryptOptional(input.credentials?.accessToken),
        matrixRoomId: input.credentials?.roomId ?? null,
        discordWebhookUrl: encryptOptional(input.credentials?.webhookUrl),
        lookaheadDays: input.lookaheadDays ?? null,
        notifyTime: input.notifyTime ?? null,
      },
      this.db,
    );

    if (results.length === 0) {
      throw new NotificationChannelNotFoundError();
    }

    return this.mapChannel(results[0]);
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
  ): Promise<NotificationChannel> {
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
          decrypt(channel.telegram_bot_token ?? ''),
          channel.telegram_chat_id ?? '',
          testMessage,
        );
        break;
      case 'matrix':
        await sendMatrixMessage(
          channel.matrix_homeserver ?? '',
          decrypt(channel.matrix_access_token ?? ''),
          channel.matrix_room_id ?? '',
          testMessage,
          testHtml,
        );
        break;
      case 'discord':
        await sendDiscordMessage(decrypt(channel.discord_webhook_url ?? ''), testMessage);
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

  /**
   * Last-4 hint for a credential stored encrypted at rest. The hint is derived
   * from the plaintext so it stays stable across the encryption cutover; a
   * credential that no longer decrypts (rotated `BETTER_AUTH_SECRET`) degrades
   * to `****` instead of failing the read, so the user can re-enter it.
   */
  private maskSecret(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    const plain = tryDecrypt(value);
    if (plain === null || plain.length <= 4) return '****';
    return `...${plain.slice(-4)}`;
  }
}
