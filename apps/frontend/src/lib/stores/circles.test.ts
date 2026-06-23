import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  class ApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
    }
  }
  return {
    ApiError,
    api: {
      listCircles: vi.fn(),
      createCircle: vi.fn(),
      updateCircle: vi.fn(),
      deleteCircle: vi.fn(),
      reorderCircles: vi.fn(),
      mergeCircles: vi.fn(),
    },
  };
});

vi.mock('$shared', () => ({ buildCircleHierarchy: (circles: unknown) => circles }));
vi.mock('../api/circles.js', () => h.api);
vi.mock('../api/auth.js', () => ({ ApiError: h.ApiError }));

import type { Circle } from '$shared';
import { circles, circlesList, getCirclePath } from './circles.js';

const circle = (id: string, sortOrder: number, parentCircleId: string | null = null): Circle =>
  ({ id, name: id.toUpperCase(), sortOrder, parentCircleId }) as unknown as Circle;

describe('circles store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    circles.clear();
  });

  afterEach(() => {
    circles.clear();
  });

  describe('loadCircles', () => {
    it('loads and caches: a second call serves from cache without refetching', async () => {
      h.api.listCircles.mockResolvedValue([circle('a', 0)]);

      await circles.loadCircles();
      await circles.loadCircles();

      expect(h.api.listCircles).toHaveBeenCalledTimes(1);
      expect(get(circles).circles).toHaveLength(1);
    });

    it('force=true bypasses the cache', async () => {
      h.api.listCircles.mockResolvedValue([circle('a', 0)]);
      await circles.loadCircles();

      await circles.loadCircles(true);

      expect(h.api.listCircles).toHaveBeenCalledTimes(2);
    });

    it('dedupes concurrent in-flight loads into one request', async () => {
      h.api.listCircles.mockResolvedValue([circle('a', 0)]);

      await Promise.all([circles.loadCircles(), circles.loadCircles()]);

      expect(h.api.listCircles).toHaveBeenCalledTimes(1);
    });
  });

  describe('mutations', () => {
    it('createCircle appends to the list', async () => {
      h.api.createCircle.mockResolvedValue(circle('b', 1));
      await circles.createCircle({ name: 'B' } as never);
      expect(get(circles).circles.map((c) => c.id)).toEqual(['b']);
    });

    it('updateCircle replaces the matching circle', async () => {
      h.api.listCircles.mockResolvedValue([circle('a', 0), circle('b', 1)]);
      await circles.loadCircles();

      h.api.updateCircle.mockResolvedValue({ ...circle('a', 0), name: 'Renamed' });
      await circles.updateCircle('a', { name: 'Renamed' });

      expect(get(circles).circles.find((c) => c.id === 'a')?.name).toBe('Renamed');
    });

    it('deleteCircle removes the circle', async () => {
      h.api.listCircles.mockResolvedValue([circle('a', 0), circle('b', 1)]);
      await circles.loadCircles();

      h.api.deleteCircle.mockResolvedValue(undefined);
      await circles.deleteCircle('a');

      expect(get(circles).circles.map((c) => c.id)).toEqual(['b']);
    });

    it('reorderCircles applies the new sort order and re-sorts', async () => {
      h.api.listCircles.mockResolvedValue([circle('a', 0), circle('b', 1)]);
      await circles.loadCircles();

      h.api.reorderCircles.mockResolvedValue(undefined);
      await circles.reorderCircles([
        { id: 'a', sort_order: 1 },
        { id: 'b', sort_order: 0 },
      ]);

      expect(get(circles).circles.map((c) => c.id)).toEqual(['b', 'a']);
    });

    it('mergeCircles removes the source and replaces the target', async () => {
      h.api.listCircles.mockResolvedValue([circle('target', 0), circle('source', 1)]);
      await circles.loadCircles();

      h.api.mergeCircles.mockResolvedValue({ ...circle('target', 0), name: 'Merged' });
      await circles.mergeCircles('target', 'source');

      const ids = get(circles).circles.map((c) => c.id);
      expect(ids).toEqual(['target']);
      expect(get(circles).circles[0].name).toBe('Merged');
    });
  });

  describe('derived & helpers', () => {
    it('circlesList is sorted by sortOrder', async () => {
      h.api.listCircles.mockResolvedValue([circle('a', 2), circle('b', 0), circle('c', 1)]);
      await circles.loadCircles();

      expect(get(circlesList).map((c) => c.id)).toEqual(['b', 'c', 'a']);
    });

    it('getCirclePath walks the parent chain', () => {
      const map = new Map([
        ['root', circle('root', 0, null)],
        ['mid', circle('mid', 0, 'root')],
        ['leaf', circle('leaf', 0, 'mid')],
      ]);

      expect(getCirclePath('leaf', map)).toBe('ROOT → MID → LEAF');
    });

    it('getCirclePath stops when an ancestor is missing', () => {
      const map = new Map([['leaf', circle('leaf', 0, 'gone')]]);
      expect(getCirclePath('leaf', map)).toBe('LEAF');
    });
  });
});
