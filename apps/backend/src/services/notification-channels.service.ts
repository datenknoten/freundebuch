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
import { toUniqueViolationError } from '../utils/to-unique-violation-error.js';
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

export interface NotificationChannelCreateData {
  platform: string;
  isEnabled?: boolean;
  lookaheadDays?: number;
  notifyTime?: string;
  credentials: Record<string, string>;
}

export interface NotificationChannelUpdateData {
  isEnabled?: boolean;
  lookaheadDays?: number;
  notifyTime?: string;
  credentials?: Record<string, string>;
}

export class NotificationChannelsService {
  private readonly db: Pool;
  private readonly credentialsKey: Buffer;

  constructor(options: NotificationChannelsServiceOptions) {
    this.db = options.db;
    this.credentialsKey = options.credentialsKey;
  }

  /** Credentials come back masked. */
  public async listChannels(userExternalId: string) {
    const results = await getChannelsByUserId.run({ userExternalId }, this.db);
    return results.map((row) => this.mapChannel(userExternalId, row));
  }

  /** Credentials come back masked. */
  public async getChannel(userExternalId: string, channelExternalId: string) {
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

  public async createChannel(userExternalId: string, data: NotificationChannelCreateData) {
    try {
      const results = await createChannel.run(
        {
          userExternalId,
          platform: data.platform,
          isEnabled: data.isEnabled ?? true,
          telegramBotToken: encryptOptional(
            data.credentials.botToken,
            credentialContext(userExternalId, 'telegram_bot_token'),
            this.credentialsKey,
          ),
          telegramChatId: data.credentials.chatId ?? null,
          matrixHomeserver: data.credentials.homeserver ?? null,
          matrixAccessToken: encryptOptional(
            data.credentials.accessToken,
            credentialContext(userExternalId, 'matrix_access_token'),
            this.credentialsKey,
          ),
          matrixRoomId: data.credentials.roomId ?? null,
          discordWebhookUrl: encryptOptional(
            data.credentials.webhookUrl,
            credentialContext(userExternalId, 'discord_webhook_url'),
            this.credentialsKey,
          ),
          lookaheadDays: data.lookaheadDays ?? null,
          notifyTime: data.notifyTime ?? null,
        },
        this.db,
      );

      const [row] = results;
      if (row === undefined) {
        throw new UserNotFoundError(userExternalId);
      }

      return this.mapChannel(userExternalId, row);
    } catch (error) {
      throw toUniqueViolationError(error, {
        uq_notification_channels_user_platform() {
          return new NotificationChannelAlreadyExistsError(data.platform);
        },
      });
    }
  }

  public async updateChannel(
    userExternalId: string,
    channelExternalId: string,
    data: NotificationChannelUpdateData,
  ) {
    const results = await updateChannel.run(
      {
        userExternalId,
        channelExternalId,
        isEnabled: data.isEnabled ?? null,
        telegramBotToken: encryptOptional(
          data.credentials?.botToken,
          credentialContext(userExternalId, 'telegram_bot_token'),
          this.credentialsKey,
        ),
        telegramChatId: data.credentials?.chatId ?? null,
        matrixHomeserver: data.credentials?.homeserver ?? null,
        matrixAccessToken: encryptOptional(
          data.credentials?.accessToken,
          credentialContext(userExternalId, 'matrix_access_token'),
          this.credentialsKey,
        ),
        matrixRoomId: data.credentials?.roomId ?? null,
        discordWebhookUrl: encryptOptional(
          data.credentials?.webhookUrl,
          credentialContext(userExternalId, 'discord_webhook_url'),
          this.credentialsKey,
        ),
        lookaheadDays: data.lookaheadDays ?? null,
        notifyTime: data.notifyTime ?? null,
      },
      this.db,
    );

    const [row] = results;
    if (row === undefined) {
      throw new NotificationChannelNotFoundError(channelExternalId);
    }

    return this.mapChannel(userExternalId, row);
  }

  public async deleteChannel(userExternalId: string, channelExternalId: string) {
    const results = await deleteChannel.run({ userExternalId, channelExternalId }, this.db);
    if (results.length === 0) {
      throw new NotificationChannelNotFoundError(channelExternalId);
    }
  }

  public async toggleChannel(
    userExternalId: string,
    channelExternalId: string,
    isEnabled: boolean,
  ) {
    return this.updateChannel(userExternalId, channelExternalId, { isEnabled });
  }

  /** Sends a test message to verify the channel configuration. */
  public async sendTestMessage(userExternalId: string, channelExternalId: string) {
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

  private mapChannel(userExternalId: string, row: ChannelRow) {
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
      // The column is CHECK-constrained to the NotificationPlatform values.
      platform: row.platform as NotificationChannelResponse['platform'],
      isEnabled: row.is_enabled,
      lookaheadDays: row.lookahead_days,
      notifyTime,
      credentials,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    } satisfies NotificationChannelResponse;
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
  ) {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const plain = tryDecrypt(value, credentialContext(userExternalId, column), this.credentialsKey);
    if (plain === null || plain.length <= 4) {
      return '****';
    }
    return `...${plain.slice(-4)}`;
  }
}
