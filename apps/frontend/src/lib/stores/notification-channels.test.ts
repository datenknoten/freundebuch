import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationChannelResponse } from '$shared';
import { ApiClient } from '../api/api-client.js';
import { ApiError } from '../api/api-error.js';
import { NotificationChannelsApi } from '../api/notification-channels.js';
import { NotificationChannelsStore } from './notification-channels.js';

const A_CHANNEL: NotificationChannelResponse = {
  externalId: 'ch-1',
  platform: 'telegram',
  isEnabled: true,
  lookaheadDays: 7,
  notifyTime: '09:00',
  credentials: { chatId: '42' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

async function stayUnauthenticated() {
  return false;
}

function createStore() {
  const notificationChannelsApi = new NotificationChannelsApi({
    client: new ApiClient({
      baseUrl: '',
      logger: createRootLogger({ LOG_LEVEL: 'silent' }),
      onUnauthorized: stayUnauthenticated,
    }),
  });
  return {
    notificationChannelsApi,
    store: new NotificationChannelsStore({ notificationChannelsApi }),
  };
}

describe('NotificationChannelsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadChannels', () => {
    it('stores the loaded channels', async () => {
      const { notificationChannelsApi, store } = createStore();
      vi.spyOn(notificationChannelsApi, 'listChannels').mockResolvedValue([A_CHANNEL]);

      await store.loadChannels();

      expect(get(store)).toEqual({ channels: [A_CHANNEL], isLoading: false, error: null });
    });

    it('keeps the backend message and rethrows when loading fails', async () => {
      const { notificationChannelsApi, store } = createStore();
      vi.spyOn(notificationChannelsApi, 'listChannels').mockRejectedValue(
        new ApiError(500, 'Database down'),
      );

      await expect(store.loadChannels()).rejects.toBeInstanceOf(ApiError);
      expect(get(store).error).toBe('Database down');
    });
  });

  describe('toggleChannel', () => {
    it('replaces the toggled channel', async () => {
      const { notificationChannelsApi, store } = createStore();
      vi.spyOn(notificationChannelsApi, 'listChannels').mockResolvedValue([A_CHANNEL]);
      vi.spyOn(notificationChannelsApi, 'toggleChannel').mockResolvedValue({
        ...A_CHANNEL,
        isEnabled: false,
      });
      await store.loadChannels();

      await store.toggleChannel('ch-1', false);

      expect(get(store).channels).toEqual([{ ...A_CHANNEL, isEnabled: false }]);
    });
  });

  describe('deleteChannel', () => {
    it('removes the deleted channel', async () => {
      const { notificationChannelsApi, store } = createStore();
      vi.spyOn(notificationChannelsApi, 'listChannels').mockResolvedValue([A_CHANNEL]);
      vi.spyOn(notificationChannelsApi, 'deleteChannel').mockResolvedValue();
      await store.loadChannels();

      await store.deleteChannel('ch-1');

      expect(get(store).channels).toEqual([]);
    });
  });
});
