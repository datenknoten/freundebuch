import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { CirclesApi } from './circles.js';

const A_CIRCLE = {
  id: 'c-1',
  name: 'Close friends',
  color: '#3B82F6',
  parentCircleId: null,
  sortOrder: 0,
  friendCount: 3,
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

function createCirclesApi() {
  const client = new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
  return new CirclesApi({ client });
}

function sentBody() {
  return JSON.parse(String(itemAt(fetchMock.mock.calls, 0)[1]?.body));
}

describe('CirclesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listCircles', () => {
    it('returns the circles of the response', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([A_CIRCLE]));

      await expect(createCirclesApi().listCircles()).resolves.toEqual([A_CIRCLE]);
    });

    it('throws ValidationError when a circle lacks a field', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 'c-1', name: 'Close friends' }]));

      await expect(createCirclesApi().listCircles()).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('createCircle', () => {
    it('sends the circle as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(A_CIRCLE, 201));

      await createCirclesApi().createCircle({
        name: 'Close friends',
        color: '#3B82F6',
        parentCircleId: 'c-0',
      });

      expect(sentBody()).toEqual({
        name: 'Close friends',
        color: '#3B82F6',
        parent_circle_id: 'c-0',
      });
    });
  });

  describe('reorderCircles', () => {
    it('sends each sortOrder as sort_order', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

      await createCirclesApi().reorderCircles([{ id: 'c-1', sortOrder: 2 }]);

      expect(sentBody()).toEqual({ order: [{ id: 'c-1', sort_order: 2 }] });
    });
  });

  describe('deleteCircle', () => {
    it('resolves once the backend confirms the deletion', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

      await expect(createCirclesApi().deleteCircle('c-1')).resolves.toBeUndefined();
    });

    it('throws ValidationError when the confirmation is malformed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ deleted: 'yes' }));

      await expect(createCirclesApi().deleteCircle('c-1')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('addFriendToCircle', () => {
    it('returns the circle summary of the assignment', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 'c-1', name: 'Close friends', color: null }, 201),
      );

      await expect(createCirclesApi().addFriendToCircle('f-1', 'c-1')).resolves.toEqual({
        id: 'c-1',
        name: 'Close friends',
        color: null,
      });
    });
  });
});
