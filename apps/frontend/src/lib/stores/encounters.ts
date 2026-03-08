import { derived, writable } from 'svelte/store';
import type {
  Encounter,
  EncounterInput,
  EncounterListItem,
  EncounterUpdate,
  LastEncounterSummary,
  PaginationInfo,
} from '$shared';
import type { EncounterListParams } from '../api/encounters.js';
import * as encountersApi from '../api/encounters.js';
import { storeAction } from './storeAction.js';

interface FilterState {
  friendId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

interface EncountersState {
  encounters: EncounterListItem[];
  currentEncounter: Encounter | null;
  pagination: PaginationInfo;
  filters: FilterState;
  isLoading: boolean;
  error: string | null;
}

const initialState: EncountersState = {
  encounters: [],
  currentEncounter: null,
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  },
  filters: {},
  isLoading: false,
  error: null,
};

function createEncountersStore() {
  const { subscribe, set, update } = writable<EncountersState>(initialState);

  return {
    subscribe,

    loadEncounters: (params: EncounterListParams = {}) =>
      storeAction(
        update,
        () => encountersApi.listEncounters(params),
        (_state, result) => ({
          encounters: result.encounters,
          pagination: result.pagination,
          filters: {
            friendId: params.friendId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            search: params.search,
          },
        }),
        'Failed to load encounters',
      ),

    loadEncounter: (encounterId: string) =>
      storeAction(
        update,
        () => encountersApi.getEncounter(encounterId),
        (_state, encounter) => ({ currentEncounter: encounter }),
        'Failed to load encounter',
        () => ({ currentEncounter: null }),
      ),

    createEncounter: (input: EncounterInput) =>
      storeAction(
        update,
        () => encountersApi.createEncounter(input),
        (state, encounter) => ({
          encounters: [
            {
              id: encounter.id,
              title: encounter.title,
              encounterDate: encounter.encounterDate,
              locationText: encounter.locationText,
              friendCount: encounter.friends.length,
              friends: encounter.friends.slice(0, 3),
              createdAt: encounter.createdAt,
            },
            ...state.encounters,
          ],
          pagination: {
            ...state.pagination,
            totalCount: state.pagination.totalCount + 1,
            totalPages: Math.ceil((state.pagination.totalCount + 1) / state.pagination.pageSize),
          },
        }),
        'Failed to create encounter',
      ),

    updateEncounter: (encounterId: string, input: EncounterUpdate) =>
      storeAction(
        update,
        () => encountersApi.updateEncounter(encounterId, input),
        (state, encounter) => ({
          currentEncounter:
            state.currentEncounter?.id === encounterId ? encounter : state.currentEncounter,
          encounters: state.encounters.map((e) =>
            e.id === encounterId
              ? {
                  id: encounter.id,
                  title: encounter.title,
                  encounterDate: encounter.encounterDate,
                  locationText: encounter.locationText,
                  friendCount: encounter.friends.length,
                  friends: encounter.friends.slice(0, 3),
                  createdAt: encounter.createdAt,
                }
              : e,
          ),
        }),
        'Failed to update encounter',
      ),

    deleteEncounter: (encounterId: string) =>
      storeAction(
        update,
        () => encountersApi.deleteEncounter(encounterId),
        (state) => ({
          currentEncounter:
            state.currentEncounter?.id === encounterId ? null : state.currentEncounter,
          encounters: state.encounters.filter((e) => e.id !== encounterId),
          pagination: {
            ...state.pagination,
            totalCount: Math.max(0, state.pagination.totalCount - 1),
            totalPages: Math.ceil(
              Math.max(0, state.pagination.totalCount - 1) / state.pagination.pageSize,
            ),
          },
        }),
        'Failed to delete encounter',
      ),

    setFilters: async (filters: FilterState) => {
      update((state) => ({ ...state, filters }));
    },

    clearCurrentEncounter: () => {
      update((state) => ({ ...state, currentEncounter: null }));
    },

    clear: () => {
      set(initialState);
    },
  };
}

export const encounters = createEncountersStore();

export const encountersList = derived(encounters, ($encounters) =>
  [...$encounters.encounters].sort(
    (a, b) => new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime(),
  ),
);

export const isLoadingEncounters = derived(encounters, ($encounters) => $encounters.isLoading);

export const encountersError = derived(encounters, ($encounters) => $encounters.error);

// ============================================================================
// Friend-specific Encounter Helpers
// ============================================================================

export async function getFriendEncounters(
  friendId: string,
  params: Omit<EncounterListParams, 'friendId'> = {},
) {
  return encountersApi.getFriendEncounters(friendId, params);
}

export async function getLastEncounter(friendId: string): Promise<LastEncounterSummary | null> {
  return encountersApi.getLastEncounter(friendId);
}
