import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { NotificationChannelsApi } from './notification-channels.js';

const A_CHANNEL = {
  externalId: 'ch-1',
  platform: 'telegram',
  isEnabled: true,
  lookaheadDays: 7,
  notifyTime: '09:00',
  credentials: { chatId: '42' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function stayUnauthenticated() {
  return false;
}

function createClient() {
  return new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
}

function sentRequest() {
  return itemAt(fetchMock.mock.calls, 0);
}

function createApi() {
  return new NotificationChannelsApi({ client: createClient() });
}

describe('NotificationChannelsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listChannels', () => {
    it('returns the channels of the response', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([A_CHANNEL]));

      await expect(createApi().listChannels()).resolves.toEqual([A_CHANNEL]);
    });

    it('throws ValidationError when a channel names an unknown platform', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ ...A_CHANNEL, platform: 'fax' }]));

      await expect(createApi().listChannels()).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('createChannel', () => {
    it('sends the input and returns the created channel', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(A_CHANNEL, 201));
      const input = { platform: 'telegram' as const, credentials: { botToken: 't', chatId: '42' } };

      await expect(createApi().createChannel(input)).resolves.toEqual(A_CHANNEL);
      expect(JSON.parse(String(sentRequest()[1]?.body))).toEqual(input);
    });
  });

  describe('toggleChannel', () => {
    it('sends the enabled flag', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ ...A_CHANNEL, isEnabled: false }));

      const channel = await createApi().toggleChannel('ch-1', false);

      expect(JSON.parse(String(sentRequest()[1]?.body))).toEqual({ isEnabled: false });
      expect(channel.isEnabled).toBe(false);
    });
  });

  describe('testChannel', () => {
    it('throws ValidationError when the confirmation is malformed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ sent: true }));

      await expect(createApi().testChannel('ch-1')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('deleteChannel', () => {
    it('resolves once the backend confirms the deletion', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

      await expect(createApi().deleteChannel('ch-1')).resolves.toBeUndefined();
    });
  });
});
