import type { NotificationChannelResponse } from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import { NotificationChannelAlreadyExistsError } from '../errors/notification-channel-already-exists.error.js';
import { NotificationChannelNotFoundError } from '../errors/notification-channel-not-found.error.js';
import { NotificationDeliveryError } from '../errors/notification-delivery.error.js';
import { UserNotFoundError } from '../errors/user-not-found.error.js';
import {
  createChannel,
  deleteChannel,
  getChannelByExternalId,
  getChannelsByUserId,
  type IGetChannelByExternalIdResult,
  type IGetChannelsByUserIdResult,
  updateChannel,
} from '../models/queries/notification-channels.queries.js';
import { type CredentialColumn, credentialContext } from '../utils/credential-context.js';
import { decrypt } from '../utils/decrypt.js';
import { encryptOptional } from '../utils/encrypt-optional.js';
import { rethrowUniqueViolation } from '../utils/rethrow-unique-violation.js';
import { tryDecrypt } from '../utils/try-decrypt.js';
import { sendDiscordMessage } from './external/discord.client.js';
import { sendMatrixMessage } from './external/matrix.client.js';
import { sendTelegramMessage } from './external/telegram.client.js';

type ChannelRow = IGetChannelsByUserIdResult | IGetChannelByExternalIdResult;

export interface NotificationChannelsServiceOptions {
  db: Pool;
  /** From deriveCredentialsKey(config.BETTER_AUTH_SECRET). */
  credentialsKey: Buffer;
}

/**
 * Service for managing notification channels (messaging bot configurations)
 */
export class NotificationChannelsService {
  private readonly db: Pool;
  private readonly credentialsKey: Buffer;

  constructor(options: NotificationChannelsServiceOptions) {
    this.db = options.db;
    this.credentialsKey = options.credentialsKey;
  }

  /**
   * List all channels for a user (credentials masked)
   */
  public async listChannels(userExternalId: string): Promise<NotificationChannelResponse[]> {
    const results = await getChannelsByUserId.run({ userExternalId }, this.db);
    return results.map((row) => this.mapChannel(userExternalId, row));
  }

  /**
   * Get a single channel by external ID (credentials masked)
   */
  public async getChannel(
    userExternalId: string,
    channelExternalId: string,
  ): Promise<NotificationChannelResponse> {
    const results = await getChannelByExternalId.run(
      { userExternalId, channelExternalId },
      this.db,
    );
    const [row] = results;
    if (row === undefined) {
      throw new NotificationChannelNotFoundError(channelExternalId);
    }
    return this.mapChannel(userExternalId, row);
  }

  /**
   * Create a new notification channel
   */
  public async createChannel(
    userExternalId: string,
    input: {
      platform: string;
      isEnabled?: boolean;
      lookaheadDays?: number;
      notifyTime?: string;
      credentials: Record<string, string>;
    },
  ): Promise<NotificationChannelResponse> {
    try {
      const results = await createChannel.run(
        {
          userExternalId,
          platform: input.platform,
          isEnabled: input.isEnabled ?? true,
          telegramBotToken: encryptOptional(
            input.credentials.botToken,
            credentialContext(userExternalId, 'telegram_bot_token'),
            this.credentialsKey,
          ),
          telegramChatId: input.credentials.chatId ?? null,
          matrixHomeserver: input.credentials.homeserver ?? null,
          matrixAccessToken: encryptOptional(
            input.credentials.accessToken,
            credentialContext(userExternalId, 'matrix_access_token'),
            this.credentialsKey,
          ),
          matrixRoomId: input.credentials.roomId ?? null,
          discordWebhookUrl: encryptOptional(
            input.credentials.webhookUrl,
            credentialContext(userExternalId, 'discord_webhook_url'),
            this.credentialsKey,
          ),
          lookaheadDays: input.lookaheadDays ?? null,
          notifyTime: input.notifyTime ?? null,
        },
        this.db,
      );

      const [row] = results;
      if (row === undefined) {
        throw new UserNotFoundError(userExternalId);
      }

      return this.mapChannel(userExternalId, row);
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
  public async updateChannel(
    userExternalId: string,
    channelExternalId: string,
    input: {
      isEnabled?: boolean;
      lookaheadDays?: number;
      notifyTime?: string;
      credentials?: Record<string, string>;
    },
  ): Promise<NotificationChannelResponse> {
    const results = await updateChannel.run(
      {
        userExternalId,
        channelExternalId,
        isEnabled: input.isEnabled ?? null,
        telegramBotToken: encryptOptional(
          input.credentials?.botToken,
          credentialContext(userExternalId, 'telegram_bot_token'),
          this.credentialsKey,
        ),
        telegramChatId: input.credentials?.chatId ?? null,
        matrixHomeserver: input.credentials?.homeserver ?? null,
        matrixAccessToken: encryptOptional(
          input.credentials?.accessToken,
          credentialContext(userExternalId, 'matrix_access_token'),
          this.credentialsKey,
        ),
        matrixRoomId: input.credentials?.roomId ?? null,
        discordWebhookUrl: encryptOptional(
          input.credentials?.webhookUrl,
          credentialContext(userExternalId, 'discord_webhook_url'),
          this.credentialsKey,
        ),
        lookaheadDays: input.lookaheadDays ?? null,
        notifyTime: input.notifyTime ?? null,
      },
      this.db,
    );

    const [row] = results;
    if (row === undefined) {
      throw new NotificationChannelNotFoundError(channelExternalId);
    }

    return this.mapChannel(userExternalId, row);
  }

  /**
   * Delete a notification channel
   */
  public async deleteChannel(userExternalId: string, channelExternalId: string): Promise<boolean> {
    const results = await deleteChannel.run({ userExternalId, channelExternalId }, this.db);
    return results.length > 0;
  }

  /**
   * Toggle a channel's enabled/disabled state
   */
  public async toggleChannel(
    userExternalId: string,
    channelExternalId: string,
    isEnabled: boolean,
  ): Promise<NotificationChannelResponse> {
    return this.updateChannel(userExternalId, channelExternalId, { isEnabled });
  }

  /**
   * Send a test message to verify channel configuration
   */
  public async sendTestMessage(userExternalId: string, channelExternalId: string): Promise<void> {
    const results = await getChannelByExternalId.run(
      { userExternalId, channelExternalId },
      this.db,
    );
    const [channel] = results;
    if (channel === undefined) {
      throw new NotificationChannelNotFoundError(channelExternalId);
    }

    const testMessage = 'Freundebuch - Test notification. Your channel is configured correctly!';
    const testHtml =
      '<b>Freundebuch</b> - Test notification. Your channel is configured correctly!';

    switch (channel.platform) {
      case 'telegram':
        await sendTelegramMessage(
          decrypt(
            channel.telegram_bot_token ?? '',
            credentialContext(userExternalId, 'telegram_bot_token'),
            this.credentialsKey,
          ),
          channel.telegram_chat_id ?? '',
          testMessage,
        );
        break;
      case 'matrix':
        await sendMatrixMessage(
          channel.matrix_homeserver ?? '',
          decrypt(
            channel.matrix_access_token ?? '',
            credentialContext(userExternalId, 'matrix_access_token'),
            this.credentialsKey,
          ),
          channel.matrix_room_id ?? '',
          testMessage,
          testHtml,
        );
        break;
      case 'discord':
        await sendDiscordMessage(
          decrypt(
            channel.discord_webhook_url ?? '',
            credentialContext(userExternalId, 'discord_webhook_url'),
            this.credentialsKey,
          ),
          testMessage,
        );
        break;
      default:
        throw new NotificationDeliveryError(channel.platform, 'Unknown platform');
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapChannel(userExternalId: string, row: ChannelRow): NotificationChannelResponse {
    const credentials: NotificationChannelResponse['credentials'] = {};

    switch (row.platform) {
      case 'telegram':
        credentials.botToken = this.maskSecret(
          userExternalId,
          'telegram_bot_token',
          row.telegram_bot_token,
        );
        credentials.chatId = row.telegram_chat_id ?? undefined;
        break;
      case 'matrix':
        credentials.homeserver = row.matrix_homeserver ?? undefined;
        credentials.accessToken = this.maskSecret(
          userExternalId,
          'matrix_access_token',
          row.matrix_access_token,
        );
        credentials.roomId = row.matrix_room_id ?? undefined;
        break;
      case 'discord':
        credentials.webhookUrl = this.maskSecret(
          userExternalId,
          'discord_webhook_url',
          row.discord_webhook_url,
        );
        break;
    }

    // Format notify_time: stored as TIME, comes back as string "HH:MM:SS"
    const notifyTimeRaw = String(row.notify_time);
    const notifyTime = notifyTimeRaw.slice(0, 5); // "HH:MM"

    return {
      externalId: row.external_id,
      platform: row.platform as NotificationChannelResponse['platform'],
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
  private maskSecret(
    userExternalId: string,
    column: CredentialColumn,
    value: string | null | undefined,
  ): string | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const plain = tryDecrypt(value, credentialContext(userExternalId, column), this.credentialsKey);
    if (plain === null || plain.length <= 4) return '****';
    return `...${plain.slice(-4)}`;
  }
}
