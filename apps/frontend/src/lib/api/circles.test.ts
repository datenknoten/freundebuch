import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$shared', () => ({}));

import { jsonResponse, restoreFetch, stubFetch } from '$lib/test';
import {
  addFriendToCircle,
  archiveFriend,
  createCircle,
  deleteCircle,
  getCircle,
  listCircles,
  mergeCircles,
  removeFriendFromCircle,
  reorderCircles,
  setFriendCircles,
  toggleFavorite,
  unarchiveFriend,
} from './circles.js';

describe('circles API', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
  });

  afterEach(restoreFetch);

  describe('circle CRUD', () => {
    it('listCircles GETs the collection', async () => {
      fetchMock.mockResolvedValue(jsonResponse([{ id: 'c-1' }]));
      await listCircles();
      expect(fetchMock).toHaveBeenCalledWith('/api/circles', expect.objectContaining({}));
    });

    it('getCircle GETs by id', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'c-1' }));
      await getCircle('c-1');
      expect(fetchMock).toHaveBeenCalledWith('/api/circles/c-1', expect.objectContaining({}));
    });

    it('createCircle POSTs the input', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'c-1' }));
      await createCircle({ name: 'Close', color: '#fff' } as never);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/circles',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Close', color: '#fff' }),
        }),
      );
    });

    it('updateCircle and deleteCircle hit the id endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'c-1' }));
      await deleteCircle('c-1');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/circles/c-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('reorderCircles PUTs the order array', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true }));
      const order = [{ id: 'c-1', sort_order: 0 }];
      await reorderCircles(order);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/circles/reorder',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ order }) }),
      );
    });

    it('mergeCircles posts the source id to the target merge endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'target' }));
      await mergeCircles('target', 'source');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/circles/target/merge',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ source_circle_id: 'source' }),
        }),
      );
    });
  });

  describe('friend-circle assignment', () => {
    it('setFriendCircles PUTs the circle_ids', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));
      await setFriendCircles('f-1', ['c-1', 'c-2']);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/f-1/circles',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ circle_ids: ['c-1', 'c-2'] }),
        }),
      );
    });

    it('addFriendToCircle POSTs to the nested endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'c-1' }));
      await addFriendToCircle('f-1', 'c-1');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/f-1/circles/c-1',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('removeFriendFromCircle DELETEs the nested endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'ok' }));
      await removeFriendFromCircle('f-1', 'c-1');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/f-1/circles/c-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('favorites & archive', () => {
    it('toggleFavorite returns the unwrapped is_favorite flag', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ is_favorite: true }));
      const result = await toggleFavorite('f-1');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/f-1/favorite',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('archiveFriend posts the reason', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'ok' }));
      await archiveFriend('f-1', 'Lost touch');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/f-1/archive',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ reason: 'Lost touch' }) }),
      );
    });

    it('unarchiveFriend posts to the unarchive endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'ok' }));
      await unarchiveFriend('f-1');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/f-1/unarchive',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
