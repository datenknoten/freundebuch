import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CircleResponse } from '$shared';
import { ApiClient } from '../api/api-client.js';
import { ApiError } from '../api/api-error.js';
import { CirclesApi } from '../api/circles.js';
import { aCircle as aCircleFixture } from '../test/fixtures.js';
import { CirclesStore } from './circles.js';

const logger = createRootLogger({ LOG_LEVEL: 'silent' });

function aCircle(id: string, sortOrder = 0) {
  return aCircleFixture({ id, name: id.toUpperCase(), sortOrder });
}

async function stayUnauthenticated() {
  return false;
}

function setup() {
  const circlesApi = new CirclesApi({
    client: new ApiClient({ baseUrl: '', logger, onUnauthorized: stayUnauthenticated }),
  });
  const store = new CirclesStore({ circlesApi, logger });
  return { circlesApi, store };
}

async function setupLoaded(circles: CircleResponse[]) {
  const { circlesApi, store } = setup();
  vi.spyOn(circlesApi, 'listCircles').mockResolvedValue(circles);
  await store.loadCircles();
  return { circlesApi, store };
}

function ids(store: CirclesStore) {
  return get(store).circles.map((circle) => circle.id);
}

describe('CirclesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadCircles', () => {
    it('loads and caches: a second call serves from cache without refetching', async () => {
      const { circlesApi, store } = setup();
      const listCircles = vi.spyOn(circlesApi, 'listCircles').mockResolvedValue([aCircle('a')]);

      await store.loadCircles();
      await store.loadCircles();

      expect(listCircles).toHaveBeenCalledTimes(1);
      expect(get(store).circles).toHaveLength(1);
    });

    it('refetches when asked to, despite the cache', async () => {
      const { circlesApi, store } = setup();
      const listCircles = vi.spyOn(circlesApi, 'listCircles').mockResolvedValue([aCircle('a')]);
      await store.loadCircles();

      await store.loadCircles(true);

      expect(listCircles).toHaveBeenCalledTimes(2);
    });

    it('joins a load in flight instead of sending a second request', async () => {
      const { circlesApi, store } = setup();
      const listCircles = vi.spyOn(circlesApi, 'listCircles').mockResolvedValue([aCircle('a')]);

      await Promise.all([store.loadCircles(), store.loadCircles()]);

      expect(listCircles).toHaveBeenCalledTimes(1);
    });

    it('keeps the message of an ApiError and rethrows it', async () => {
      const { circlesApi, store } = setup();
      vi.spyOn(circlesApi, 'listCircles').mockRejectedValue(new ApiError(500, 'Database down'));

      await expect(store.loadCircles()).rejects.toBeInstanceOf(ApiError);
      expect(get(store).error).toBe('Database down');
    });
  });

  describe('preloadCircles', () => {
    it('keeps a failure in the state instead of throwing it', async () => {
      const { circlesApi, store } = setup();
      vi.spyOn(circlesApi, 'listCircles').mockRejectedValue(new ApiError(500, 'Database down'));

      await expect(store.preloadCircles()).resolves.toBeUndefined();
      expect(get(store).error).toBe('Database down');
    });
  });

  describe('mutations', () => {
    it('appends a created circle', async () => {
      const { circlesApi, store } = setup();
      vi.spyOn(circlesApi, 'createCircle').mockResolvedValue(aCircle('b', 1));

      await store.createCircle({ name: 'B' });

      expect(ids(store)).toEqual(['b']);
    });

    it('replaces an updated circle', async () => {
      const { circlesApi, store } = await setupLoaded([aCircle('a'), aCircle('b', 1)]);
      vi.spyOn(circlesApi, 'updateCircle').mockResolvedValue({ ...aCircle('a'), name: 'Renamed' });

      await store.updateCircle('a', { name: 'Renamed' });

      expect(get(store).circles.find((circle) => circle.id === 'a')?.name).toBe('Renamed');
    });

    it('removes a deleted circle', async () => {
      const { circlesApi, store } = await setupLoaded([aCircle('a'), aCircle('b', 1)]);
      vi.spyOn(circlesApi, 'deleteCircle').mockResolvedValue(undefined);

      await store.deleteCircle('a');

      expect(ids(store)).toEqual(['b']);
    });

    it('applies a new order and sorts by it', async () => {
      const { circlesApi, store } = await setupLoaded([aCircle('a'), aCircle('b', 1)]);
      vi.spyOn(circlesApi, 'reorderCircles').mockResolvedValue(undefined);

      await store.reorderCircles([
        { id: 'a', sortOrder: 1 },
        { id: 'b', sortOrder: 0 },
      ]);

      expect(ids(store)).toEqual(['b', 'a']);
    });

    it('drops the source of a merge and replaces the target', async () => {
      const { circlesApi, store } = await setupLoaded([aCircle('target'), aCircle('source', 1)]);
      vi.spyOn(circlesApi, 'mergeCircles').mockResolvedValue({
        ...aCircle('target'),
        name: 'Merged',
      });

      await store.mergeCircles('target', 'source');

      expect(ids(store)).toEqual(['target']);
      expect(get(store).circles[0]?.name).toBe('Merged');
    });
  });

  describe('clear', () => {
    it('drops the cache, so the next load fetches again', async () => {
      const { circlesApi, store } = await setupLoaded([aCircle('a')]);

      store.clear();
      await store.loadCircles();

      expect(get(store).circles).toHaveLength(1);
      expect(circlesApi.listCircles).toHaveBeenCalledTimes(2);
    });
  });

  describe('list and byId', () => {
    it('lists the circles by sortOrder', async () => {
      const { store } = await setupLoaded([aCircle('a', 2), aCircle('b', 0), aCircle('c', 1)]);

      expect(get(store.list).map((circle) => circle.id)).toEqual(['b', 'c', 'a']);
    });

    it('indexes the circles by id', async () => {
      const { store } = await setupLoaded([aCircle('a'), aCircle('b', 1)]);

      expect(get(store.byId).get('b')?.name).toBe('B');
    });
  });
});
