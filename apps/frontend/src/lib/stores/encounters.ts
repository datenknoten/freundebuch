import { derived, writable } from 'svelte/store';
import type {
  Encounter,
  EncounterInput,
  EncounterListItem,
  EncounterUpdate,
  LastEncounterSummary,
} from '$shared';
import { ApiError } from '../api/auth.js';
import type { EncounterListParams } from '../api/encounters.js';
import * as encountersApi from '../api/encounters.js';

/**
 * Pagination state
 */
interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Filter state
 */
interface FilterState {
  friendId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

/**
 * Encounters state interface
 */
interface EncountersState {
  encounters: EncounterListItem[];
  currentEncounter: Encounter | null;
  pagination: PaginationState;
  filters: FilterState;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial encounters state
 */
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

/**
 * Create the encounters store
 */
function createEncountersStore() {
  const { subscribe, set, update } = writable<EncountersState>(initialState);

  return {
    subscribe,

    /**
     * Load encounters with current filters and pagination
     */
    loadEncounters: async (params: EncounterListParams = {}) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await encountersApi.listEncounters(params);

        update((state) => ({
          ...state,
          encounters: result.encounters,
          pagination: result.pagination,
          filters: {
            friendId: params.friendId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            search: params.search,
          },
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to load encounters';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Load a single encounter by ID
     */
    loadEncounter: async (encounterId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const encounter = await encountersApi.getEncounter(encounterId);

        update((state) => ({
          ...state,
          currentEncounter: encounter,
          isLoading: false,
          error: null,
        }));

        return encounter;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to load encounter';

        update((state) => ({
          ...state,
          currentEncounter: null,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Create a new encounter
     */
    createEncounter: async (input: EncounterInput) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const encounter = await encountersApi.createEncounter(input);

        // Add to list if it matches current filters (simplified: just prepend)
        update((state) => ({
          ...state,
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
          isLoading: false,
          error: null,
        }));

        return encounter;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to create encounter';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update an encounter
     */
    updateEncounter: async (encounterId: string, input: EncounterUpdate) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const encounter = await encountersApi.updateEncounter(encounterId, input);

        update((state) => ({
          ...state,
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
          isLoading: false,
          error: null,
        }));

        return encounter;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to update encounter';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete an encounter
     */
    deleteEncounter: async (encounterId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await encountersApi.deleteEncounter(encounterId);

        update((state) => ({
          ...state,
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
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to delete encounter';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Set filters and reload
     */
    setFilters: async (filters: FilterState) => {
      update((state) => ({ ...state, filters }));
      // Reload will be called by the component
    },

    /**
     * Clear current encounter
     */
    clearCurrentEncounter: () => {
      update((state) => ({ ...state, currentEncounter: null }));
    },

    /**
     * Clear the store
     */
    clear: () => {
      set(initialState);
    },
  };
}

export const encounters = createEncountersStore();

/**
 * Derived store: encounters sorted by date (most recent first)
 */
export const encountersList = derived(encounters, ($encounters) =>
  [...$encounters.encounters].sort(
    (a, b) => new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime(),
  ),
);

/**
 * Derived store: loading state
 */
export const isLoadingEncounters = derived(encounters, ($encounters) => $encounters.isLoading);

/**
 * Derived store: error state
 */
export const encountersError = derived(encounters, ($encounters) => $encounters.error);

// ============================================================================
// Friend-specific Encounter Helpers
// ============================================================================

/**
 * Get encounters for a specific friend
 */
export async function getFriendEncounters(
  friendId: string,
  params: Omit<EncounterListParams, 'friendId'> = {},
) {
  return encountersApi.getFriendEncounters(friendId, params);
}

/**
 * Get the last encounter with a specific friend
 */
export async function getLastEncounter(friendId: string): Promise<LastEncounterSummary | null> {
  return encountersApi.getLastEncounter(friendId);
}
