import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anEncounter } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { ApiError } from './api-error.js';
import { EncountersApi } from './encounters.js';

const EMPTY_PAGE = {
  data: [],
  pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
};

const LAST_ENCOUNTER = {
  id: 'e-9',
  title: 'Lunch',
  encounterType: 'in_person',
  encounterDate: '2026-02-01',
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function stayUnauthenticated() {
  return false;
}

function createEncountersApi() {
  const client = new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
  return new EncountersApi({ client });
}

function sentUrl() {
  return String(itemAt(fetchMock.mock.calls, 0)[0]);
}

function sentBody() {
  return JSON.parse(String(itemAt(fetchMock.mock.calls, 0)[1]?.body));
}

describe('EncountersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listEncounters', () => {
    it('sends the filters as snake_case query parameters and skips empty ones', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(EMPTY_PAGE));

      await createEncountersApi().listEncounters({
        page: 2,
        pageSize: 25,
        friendId: 'f-1',
        search: '',
        type: 'in_person',
      });

      expect(sentUrl()).toBe('/api/encounters?page=2&page_size=25&friend_id=f-1&type=in_person');
    });

    it('throws ValidationError when an encounter has an unknown type', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ ...EMPTY_PAGE, data: [{ ...anEncounter(), encounterType: 'telepathy' }] }),
      );

      await expect(createEncountersApi().listEncounters()).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('createEncounter', () => {
    it('sends the encounter as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(anEncounter(), 201));

      await createEncountersApi().createEncounter({
        title: 'Coffee',
        encounterDate: '2026-02-01',
        encounterType: 'in_person',
        friendIds: ['f-1'],
        locationText: 'Café',
      });

      expect(sentBody()).toEqual({
        title: 'Coffee',
        encounter_date: '2026-02-01',
        encounter_type: 'in_person',
        friend_ids: ['f-1'],
        location_text: 'Café',
      });
    });

    it('returns the encounter of the response', async () => {
      const encounter = anEncounter();
      fetchMock.mockResolvedValueOnce(jsonResponse(encounter, 201));

      await expect(
        createEncountersApi().createEncounter({ encounterDate: '2026-02-01', friendIds: ['f-1'] }),
      ).resolves.toEqual(encounter);
    });
  });

  describe('deleteEncounter', () => {
    it('throws ValidationError when the confirmation is malformed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ deleted: 'yes' }));

      await expect(createEncountersApi().deleteEncounter('e-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('findLastEncounter', () => {
    it('returns the summary when the friend has encounters', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(LAST_ENCOUNTER));

      await expect(createEncountersApi().findLastEncounter('f-1')).resolves.toEqual(LAST_ENCOUNTER);
    });

    it('returns undefined when the backend answers 404', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Encounters not found' }, 404));

      await expect(createEncountersApi().findLastEncounter('f-1')).resolves.toBeUndefined();
    });

    it('rethrows any other error status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));

      await expect(createEncountersApi().findLastEncounter('f-1')).rejects.toBeInstanceOf(ApiError);
    });
  });
});
