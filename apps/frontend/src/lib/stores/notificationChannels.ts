import { writable } from 'svelte/store';
import type {
  NotificationChannel,
  NotificationChannelCreateInput,
  NotificationChannelUpdateInput,
} from '$shared';
import * as channelsApi from '../api/notification-channels.js';
import { storeAction } from './storeAction.js';

interface NotificationChannelsState {
  channels: NotificationChannel[];
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationChannelsState = {
  channels: [],
  isLoading: false,
  error: null,
};

function createNotificationChannelsStore() {
  const { subscribe, set, update } = writable<NotificationChannelsState>(initialState);

  return {
    subscribe,

    loadChannels: () =>
      storeAction(
        update,
        () => channelsApi.listChannels(),
        (_state, channels) => ({ channels }),
        'Failed to load notification channels',
      ),

    createChannel: (input: NotificationChannelCreateInput) =>
      storeAction(
        update,
        () => channelsApi.createChannel(input),
        (state, channel) => ({ channels: [...state.channels, channel] }),
        'Failed to create notification channel',
      ),

    updateChannel: (channelId: string, input: NotificationChannelUpdateInput) =>
      storeAction(
        update,
        () => channelsApi.updateChannel(channelId, input),
        (state, updatedChannel) => ({
          channels: state.channels.map((ch) => (ch.externalId === channelId ? updatedChannel : ch)),
        }),
        'Failed to update notification channel',
      ),

    deleteChannel: (channelId: string) =>
      storeAction(
        update,
        () => channelsApi.deleteChannel(channelId),
        (state) => ({
          channels: state.channels.filter((ch) => ch.externalId !== channelId),
        }),
        'Failed to delete notification channel',
      ),

    toggleChannel: (channelId: string, isEnabled: boolean) =>
      storeAction(
        update,
        () => channelsApi.toggleChannel(channelId, isEnabled),
        (state, updatedChannel) => ({
          channels: state.channels.map((ch) => (ch.externalId === channelId ? updatedChannel : ch)),
        }),
        'Failed to toggle notification channel',
      ),

    clear: () => {
      set(initialState);
    },
  };
}

export const notificationChannels = createNotificationChannelsStore();
