import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncounterListItemResponse } from '$shared';
import { ApiClient } from '../api/api-client.js';
import { ApiError } from '../api/api-error.js';
import { EncountersApi } from '../api/encounters.js';
import { anEncounter, anEncounterListItem } from '../test/fixtures.js';
import { EncountersStore } from './encounters.js';

async function stayUnauthenticated() {
  return false;
}

function pageOf(items: EncounterListItemResponse[], totalCount = items.length) {
  return { data: items, pagination: { page: 1, pageSize: 20, totalCount, totalPages: 1 } };
}

function setup() {
  const encountersApi = new EncountersApi({
    client: new ApiClient({
      baseUrl: '',
      logger: createRootLogger({ LOG_LEVEL: 'silent' }),
      onUnauthorized: stayUnauthenticated,
    }),
  });
  const store = new EncountersStore({ encountersApi });
  return { encountersApi, store };
}

async function setupLoaded(items: EncounterListItemResponse[]) {
  const { encountersApi, store } = setup();
  vi.spyOn(encountersApi, 'listEncounters').mockResolvedValue(pageOf(items));
  await store.loadEncounters();
  return { encountersApi, store };
}

describe('EncountersStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadEncounters', () => {
    it('keeps the page, its pagination and the filters it was loaded with', async () => {
      const { encountersApi, store } = setup();
      vi.spyOn(encountersApi, 'listEncounters').mockResolvedValue(
        pageOf([anEncounterListItem({ id: 'e-1' })], 5),
      );

      await store.loadEncounters({ friendId: 'f-1', search: 'coffee' });

      const state = get(store);
      expect(state.encounters.map((item) => item.id)).toEqual(['e-1']);
      expect(state.pagination.totalCount).toBe(5);
      expect(state.filters).toMatchObject({ friendId: 'f-1', search: 'coffee' });
    });

    it('lists the encounters newest first', async () => {
      const { store } = await setupLoaded([
        anEncounterListItem({ id: 'old', encounterDate: '2026-01-01' }),
        anEncounterListItem({ id: 'new', encounterDate: '2026-03-01' }),
      ]);

      expect(get(store.list).map((item) => item.id)).toEqual(['new', 'old']);
    });
  });

  describe('loadEncounter', () => {
    it('drops the current encounter when loading another one fails', async () => {
      const { encountersApi, store } = setup();
      vi.spyOn(encountersApi, 'getEncounter')
        .mockResolvedValueOnce(anEncounter({ id: 'e-1' }))
        .mockRejectedValueOnce(new ApiError(404, 'Encounter not found'));

      await store.loadEncounter('e-1');
      await expect(store.loadEncounter('e-2')).rejects.toBeInstanceOf(ApiError);

      expect(get(store).currentEncounter).toBeNull();
      expect(get(store).error).toBe('Encounter not found');
    });
  });

  describe('createEncounter', () => {
    it('prepends the encounter as a list item and counts it', async () => {
      const { encountersApi, store } = await setupLoaded([anEncounterListItem({ id: 'e-1' })]);
      vi.spyOn(encountersApi, 'createEncounter').mockResolvedValue(anEncounter({ id: 'e-2' }));

      await store.createEncounter({ encounterDate: '2026-02-01', friendIds: ['f-1'] });

      const state = get(store);
      expect(state.encounters.map((item) => item.id)).toEqual(['e-2', 'e-1']);
      expect(state.encounters[0]?.friendCount).toBe(1);
      expect(state.pagination.totalCount).toBe(2);
    });
  });

  describe('updateEncounter', () => {
    it('replaces the list item and the current encounter', async () => {
      const { encountersApi, store } = await setupLoaded([anEncounterListItem({ id: 'e-1' })]);
      vi.spyOn(encountersApi, 'getEncounter').mockResolvedValue(anEncounter({ id: 'e-1' }));
      await store.loadEncounter('e-1');
      vi.spyOn(encountersApi, 'updateEncounter').mockResolvedValue(
        anEncounter({ id: 'e-1', title: 'Renamed' }),
      );

      await store.updateEncounter('e-1', { title: 'Renamed' });

      const state = get(store);
      expect(state.encounters[0]?.title).toBe('Renamed');
      expect(state.currentEncounter?.title).toBe('Renamed');
    });
  });

  describe('deleteEncounter', () => {
    it('removes the encounter and never lets the total drop below zero', async () => {
      const { encountersApi, store } = await setupLoaded([anEncounterListItem({ id: 'e-1' })]);
      vi.spyOn(encountersApi, 'deleteEncounter').mockResolvedValue(undefined);

      await store.deleteEncounter('e-1');

      const state = get(store);
      expect(state.encounters).toHaveLength(0);
      expect(state.pagination.totalCount).toBe(0);
    });
  });

  describe('clear', () => {
    it('resets the store to its initial state', async () => {
      const { store } = await setupLoaded([anEncounterListItem()]);

      store.clear();

      expect(get(store).encounters).toHaveLength(0);
    });
  });
});
