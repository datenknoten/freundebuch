import {
  type NotificationChannelCreateInputSchema,
  NotificationChannelResponseSchema,
  type NotificationChannelToggleInputSchema,
  type NotificationChannelUpdateInputSchema,
  SuccessResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';

export interface NotificationChannelsApiOptions {
  client: ApiClient;
}

const NotificationChannelResponseListSchema = NotificationChannelResponseSchema.array();

export class NotificationChannelsApi {
  private readonly client: ApiClient;

  public constructor(options: NotificationChannelsApiOptions) {
    this.client = options.client;
  }

  public listChannels() {
    return this.client.request(NotificationChannelResponseListSchema, '/api/notification-channels');
  }

  public createChannel(input: typeof NotificationChannelCreateInputSchema.inferIn) {
    return this.client.request(NotificationChannelResponseSchema, '/api/notification-channels', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public updateChannel(
    channelId: string,
    input: typeof NotificationChannelUpdateInputSchema.inferIn,
  ) {
    return this.client.request(
      NotificationChannelResponseSchema,
      `/api/notification-channels/${channelId}`,
      { method: 'PUT', body: JSON.stringify(input) },
    );
  }

  public async deleteChannel(channelId: string) {
    await this.client.request(SuccessResponseSchema, `/api/notification-channels/${channelId}`, {
      method: 'DELETE',
    });
  }

  /** Sends a test message through the channel. */
  public async testChannel(channelId: string) {
    await this.client.request(
      SuccessResponseSchema,
      `/api/notification-channels/${channelId}/test`,
      { method: 'POST' },
    );
  }

  public toggleChannel(channelId: string, isEnabled: boolean) {
    const input = { isEnabled } satisfies typeof NotificationChannelToggleInputSchema.inferIn;
    return this.client.request(
      NotificationChannelResponseSchema,
      `/api/notification-channels/${channelId}/toggle`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  }
}
