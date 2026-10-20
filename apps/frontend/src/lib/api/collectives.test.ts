import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aCollective } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { CollectivesApi } from './collectives.js';

const EMPTY_PAGE = {
  data: [],
  pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function stayUnauthenticated() {
  return false;
}

function createCollectivesApi() {
  const client = new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
  return new CollectivesApi({ client });
}

function sentUrl() {
  return String(itemAt(fetchMock.mock.calls, 0)[0]);
}

function sentBody() {
  return JSON.parse(String(itemAt(fetchMock.mock.calls, 0)[1]?.body));
}

describe('CollectivesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listCollectives', () => {
    it('returns the page of the response', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(EMPTY_PAGE));

      await expect(createCollectivesApi().listCollectives()).resolves.toEqual(EMPTY_PAGE);
    });

    it('sends the filters as snake_case query parameters and skips empty ones', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(EMPTY_PAGE));

      await createCollectivesApi().listCollectives({
        page: 2,
        pageSize: 50,
        typeId: 'club-1',
        search: '',
        shouldIncludeDeleted: true,
      });

      expect(sentUrl()).toBe(
        '/api/collectives?page=2&page_size=50&type_id=club-1&include_deleted=true',
      );
    });

    it('throws ValidationError when the page lacks its pagination', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

      await expect(createCollectivesApi().listCollectives()).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('getCollective', () => {
    it('returns the collective of the response', async () => {
      const collective = aCollective({ name: 'Chess Club' });
      fetchMock.mockResolvedValueOnce(jsonResponse(collective));

      await expect(createCollectivesApi().getCollective(collective.id)).resolves.toEqual(
        collective,
      );
    });

    it('throws ValidationError when the collective lacks its members', async () => {
      const { members: _members, ...incomplete } = aCollective();
      fetchMock.mockResolvedValueOnce(jsonResponse(incomplete));

      await expect(createCollectivesApi().getCollective('c-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('createCollective', () => {
    it('sends the collective as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aCollective(), 201));

      await createCollectivesApi().createCollective({
        name: 'New Club',
        collectiveTypeId: 'type-1',
        notes: 'Weekly',
      });

      expect(sentBody()).toEqual({
        name: 'New Club',
        collective_type_id: 'type-1',
        notes: 'Weekly',
      });
    });
  });

  describe('deleteCollective', () => {
    it('resolves once the backend confirms the deletion', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

      await expect(createCollectivesApi().deleteCollective('c-1')).resolves.toBeUndefined();
    });

    it('throws ValidationError when the confirmation is malformed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ deleted: 'yes' }));

      await expect(createCollectivesApi().deleteCollective('c-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('listCollectiveCircles', () => {
    it('returns the circles of the collective', async () => {
      const circles = [
        { id: 'circle-1', name: 'Family', color: null, createdAt: '2026-01-01T00:00:00.000Z' },
      ];
      fetchMock.mockResolvedValueOnce(jsonResponse(circles));

      await expect(createCollectivesApi().listCollectiveCircles('c-1')).resolves.toEqual(circles);
    });

    it('throws ValidationError when a circle lacks its creation date', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse([{ id: 'circle-1', name: 'Family', color: null }]),
      );

      await expect(createCollectivesApi().listCollectiveCircles('c-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });
});
