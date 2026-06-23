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
      listEncounters: vi.fn(),
      getEncounter: vi.fn(),
      createEncounter: vi.fn(),
      updateEncounter: vi.fn(),
      deleteEncounter: vi.fn(),
    },
  };
});

vi.mock('$shared', () => ({}));
vi.mock('../api/encounters.js', () => h.api);
vi.mock('../api/auth.js', () => ({ ApiError: h.ApiError }));

import { encounters, encountersList } from './encounters.js';

const fullEncounter = (id: string, date: string, friendIds: string[] = []) => ({
  id,
  title: `Encounter ${id}`,
  encounterType: 'in_person',
  encounterDate: date,
  locationText: null,
  friends: friendIds.map((fid) => ({ id: fid })),
  createdAt: '2026-01-01T00:00:00.000Z',
});

const listItem = (id: string, date: string) => ({
  id,
  title: `Encounter ${id}`,
  encounterType: 'in_person',
  encounterDate: date,
  locationText: null,
  friendCount: 0,
  friends: [],
  createdAt: '2026-01-01T00:00:00.000Z',
});

const pageResult = (items: ReturnType<typeof listItem>[], totalCount = items.length) => ({
  encounters: items,
  pagination: { page: 1, pageSize: 20, totalCount, totalPages: 1 },
});

describe('encounters store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    encounters.clear();
  });

  afterEach(() => {
    encounters.clear();
  });

  it('loadEncounters maps results, pagination, and filters', async () => {
    h.api.listEncounters.mockResolvedValue(pageResult([listItem('e-1', '2026-02-01')], 5));

    await encounters.loadEncounters({ friendId: 'f-1', search: 'coffee' });

    const state = get(encounters);
    expect(state.encounters).toHaveLength(1);
    expect(state.pagination.totalCount).toBe(5);
    expect(state.filters).toMatchObject({ friendId: 'f-1', search: 'coffee' });
  });

  it('loadEncounter sets currentEncounter, clearing it on failure', async () => {
    h.api.getEncounter.mockResolvedValue(fullEncounter('e-1', '2026-02-01'));
    await encounters.loadEncounter('e-1');
    expect(get(encounters).currentEncounter).toMatchObject({ id: 'e-1' });

    h.api.getEncounter.mockRejectedValue(new h.ApiError(404, 'nope'));
    await expect(encounters.loadEncounter('e-2')).rejects.toThrow();
    expect(get(encounters).currentEncounter).toBeNull();
  });

  it('createEncounter prepends a list item and increments the total', async () => {
    h.api.listEncounters.mockResolvedValue(pageResult([listItem('e-1', '2026-02-01')], 1));
    await encounters.loadEncounters();

    h.api.createEncounter.mockResolvedValue(fullEncounter('e-2', '2026-03-01', ['f-1', 'f-2']));
    await encounters.createEncounter({ title: 'New' } as never);

    const state = get(encounters);
    expect(state.encounters[0]).toMatchObject({ id: 'e-2', friendCount: 2 });
    expect(state.pagination.totalCount).toBe(2);
  });

  it('updateEncounter updates the list item and currentEncounter when it matches', async () => {
    h.api.listEncounters.mockResolvedValue(pageResult([listItem('e-1', '2026-02-01')], 1));
    await encounters.loadEncounters();
    h.api.getEncounter.mockResolvedValue(fullEncounter('e-1', '2026-02-01'));
    await encounters.loadEncounter('e-1');

    h.api.updateEncounter.mockResolvedValue({
      ...fullEncounter('e-1', '2026-02-01'),
      title: 'Renamed',
    });
    await encounters.updateEncounter('e-1', { title: 'Renamed' } as never);

    const state = get(encounters);
    expect(state.encounters[0].title).toBe('Renamed');
    expect(state.currentEncounter?.title).toBe('Renamed');
  });

  it('deleteEncounter removes the item and decrements the total (clamped at 0)', async () => {
    h.api.listEncounters.mockResolvedValue(pageResult([listItem('e-1', '2026-02-01')], 1));
    await encounters.loadEncounters();

    h.api.deleteEncounter.mockResolvedValue(undefined);
    await encounters.deleteEncounter('e-1');

    const state = get(encounters);
    expect(state.encounters).toHaveLength(0);
    expect(state.pagination.totalCount).toBe(0);
  });

  it('encountersList is sorted by encounterDate descending', async () => {
    h.api.listEncounters.mockResolvedValue(
      pageResult([listItem('old', '2026-01-01'), listItem('new', '2026-05-01')], 2),
    );
    await encounters.loadEncounters();

    expect(get(encountersList).map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('clearCurrentEncounter and clear reset state', async () => {
    h.api.getEncounter.mockResolvedValue(fullEncounter('e-1', '2026-02-01'));
    await encounters.loadEncounter('e-1');

    encounters.clearCurrentEncounter();
    expect(get(encounters).currentEncounter).toBeNull();

    encounters.clear();
    expect(get(encounters).encounters).toHaveLength(0);
  });
});
