import { type Readable, writable } from 'svelte/store';
import type {
  NotificationChannelCreateInputSchema,
  NotificationChannelResponse,
  NotificationChannelUpdateInputSchema,
} from '$shared';
import type { NotificationChannelsApi } from '../api/notification-channels.js';
import { storeAction } from './store-action.js';

export interface NotificationChannelsStoreOptions {
  notificationChannelsApi: NotificationChannelsApi;
}

export interface NotificationChannelsState {
  channels: NotificationChannelResponse[];
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: NotificationChannelsState = {
  channels: [],
  isLoading: false,
  error: null,
};

function replaceChannel(state: NotificationChannelsState, updated: NotificationChannelResponse) {
  return {
    channels: state.channels.map((channel) =>
      channel.externalId === updated.externalId ? updated : channel,
    ),
  };
}

function withoutChannel(state: NotificationChannelsState, channelId: string) {
  return { channels: state.channels.filter((channel) => channel.externalId !== channelId) };
}

/** A failed action stores its message in `error` and rethrows. */
export class NotificationChannelsStore {
  public readonly subscribe: Readable<NotificationChannelsState>['subscribe'];
  private readonly state = writable(INITIAL_STATE);
  private readonly notificationChannelsApi: NotificationChannelsApi;

  public constructor(options: NotificationChannelsStoreOptions) {
    this.notificationChannelsApi = options.notificationChannelsApi;
    this.subscribe = this.state.subscribe;
  }

  public loadChannels() {
    return storeAction(
      this.state.update,
      () => this.notificationChannelsApi.listChannels(),
      (_state, channels) => ({ channels }),
      'Failed to load notification channels',
    );
  }

  public createChannel(input: typeof NotificationChannelCreateInputSchema.inferIn) {
    return storeAction(
      this.state.update,
      () => this.notificationChannelsApi.createChannel(input),
      (state, channel) => ({ channels: [...state.channels, channel] }),
      'Failed to create notification channel',
    );
  }

  public updateChannel(
    channelId: string,
    input: typeof NotificationChannelUpdateInputSchema.inferIn,
  ) {
    return storeAction(
      this.state.update,
      () => this.notificationChannelsApi.updateChannel(channelId, input),
      replaceChannel,
      'Failed to update notification channel',
    );
  }

  public deleteChannel(channelId: string) {
    return storeAction(
      this.state.update,
      () => this.notificationChannelsApi.deleteChannel(channelId),
      (state) => withoutChannel(state, channelId),
      'Failed to delete notification channel',
    );
  }

  public toggleChannel(channelId: string, isEnabled: boolean) {
    return storeAction(
      this.state.update,
      () => this.notificationChannelsApi.toggleChannel(channelId, isEnabled),
      replaceChannel,
      'Failed to toggle notification channel',
    );
  }

  public clear() {
    this.state.set(INITIAL_STATE);
  }
}
