import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$shared', () => ({}));

import { jsonResponse, restoreFetch, stubFetch } from '$lib/test';
import {
  createChannel,
  deleteChannel,
  getChannel,
  listChannels,
  testChannel,
  toggleChannel,
  updateChannel,
} from './notification-channels.js';

describe('notification-channels API', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
  });

  afterEach(restoreFetch);

  it('listChannels unwraps the data array', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: 'ch-1' }] }));

    const result = await listChannels();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notification-channels',
      expect.objectContaining({}),
    );
    expect(result).toEqual([{ id: 'ch-1' }]);
  });

  it('getChannel unwraps the single data object', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'ch-1' } }));
    const result = await getChannel('ch-1');
    expect(result).toEqual({ id: 'ch-1' });
  });

  it('createChannel POSTs the input and unwraps data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'ch-2' } }));

    const result = await createChannel({ platform: 'telegram' } as never);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notification-channels',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ platform: 'telegram' }) }),
    );
    expect(result).toEqual({ id: 'ch-2' });
  });

  it('updateChannel PUTs to the id endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'ch-1' } }));
    await updateChannel('ch-1', { isEnabled: false } as never);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notification-channels/ch-1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('deleteChannel DELETEs the id endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));
    await deleteChannel('ch-1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notification-channels/ch-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('testChannel POSTs to the test endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));
    await testChannel('ch-1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notification-channels/ch-1/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('toggleChannel PATCHes isEnabled and unwraps data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'ch-1', isEnabled: true } }));

    const result = await toggleChannel('ch-1', true);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notification-channels/ch-1/toggle',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ isEnabled: true }) }),
    );
    expect(result).toEqual({ id: 'ch-1', isEnabled: true });
  });
});
