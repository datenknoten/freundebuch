import { derived, writable } from 'svelte/store';
import type {
  Collective,
  CollectiveInput,
  CollectiveListItem,
  CollectiveType,
  CollectiveUpdate,
  MembershipDeactivate,
  MembershipInput,
  MembershipUpdate,
  RelationshipPreviewRequest,
  RelationshipPreviewResponse,
} from '$shared';
import { ApiError } from '../api/auth.js';
import type { CollectiveListParams } from '../api/collectives.js';
import * as collectivesApi from '../api/collectives.js';

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
  typeId?: string;
  search?: string;
  includeDeleted?: boolean;
}

/**
 * Collectives state interface
 */
interface CollectivesState {
  collectives: CollectiveListItem[];
  currentCollective: Collective | null;
  collectiveTypes: CollectiveType[];
  pagination: PaginationState;
  filters: FilterState;
  isLoading: boolean;
  isLoadingTypes: boolean;
  error: string | null;
}

/**
 * Initial collectives state
 */
const initialState: CollectivesState = {
  collectives: [],
  currentCollective: null,
  collectiveTypes: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  },
  filters: {},
  isLoading: false,
  isLoadingTypes: false,
  error: null,
};

/**
 * Create the collectives store
 */
function createCollectivesStore() {
  const { subscribe, set, update } = writable<CollectivesState>(initialState);

  return {
    subscribe,

    /**
     * Load collective types
     */
    loadTypes: async () => {
      update((state) => ({ ...state, isLoadingTypes: true, error: null }));

      try {
        const result = await collectivesApi.listCollectiveTypes();

        update((state) => ({
          ...state,
          collectiveTypes: result.types,
          isLoadingTypes: false,
          error: null,
        }));

        return result.types;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to load collective types';

        update((state) => ({
          ...state,
          isLoadingTypes: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Load collectives with current filters and pagination
     */
    loadCollectives: async (params: CollectiveListParams = {}) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await collectivesApi.listCollectives(params);

        update((state) => ({
          ...state,
          collectives: result.collectives,
          pagination: result.pagination,
          filters: {
            typeId: params.typeId,
            search: params.search,
            includeDeleted: params.includeDeleted,
          },
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to load collectives';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Load a single collective by ID
     */
    loadCollective: async (collectiveId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const collective = await collectivesApi.getCollective(collectiveId);

        update((state) => ({
          ...state,
          currentCollective: collective,
          isLoading: false,
          error: null,
        }));

        return collective;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to load collective';

        update((state) => ({
          ...state,
          currentCollective: null,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Create a new collective
     */
    createCollective: async (input: CollectiveInput) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const collective = await collectivesApi.createCollective(input);

        // Add to list
        update((state) => ({
          ...state,
          collectives: [
            {
              id: collective.id,
              name: collective.name,
              type: {
                id: collective.type.id,
                name: collective.type.name,
              },
              photoUrl: collective.photoUrl,
              photoThumbnailUrl: collective.photoThumbnailUrl,
              memberCount: collective.memberCount,
              activeMemberCount: collective.activeMemberCount,
              memberPreview: collective.members.slice(0, 3).map((m) => m.contact),
              createdAt: collective.createdAt,
              deletedAt: collective.deletedAt,
            },
            ...state.collectives,
          ],
          pagination: {
            ...state.pagination,
            totalCount: state.pagination.totalCount + 1,
            totalPages: Math.ceil((state.pagination.totalCount + 1) / state.pagination.pageSize),
          },
          isLoading: false,
          error: null,
        }));

        return collective;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to create collective';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update a collective
     */
    updateCollective: async (collectiveId: string, input: CollectiveUpdate) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const collective = await collectivesApi.updateCollective(collectiveId, input);

        update((state) => ({
          ...state,
          currentCollective:
            state.currentCollective?.id === collectiveId ? collective : state.currentCollective,
          collectives: state.collectives.map((c) =>
            c.id === collectiveId
              ? {
                  ...c,
                  name: collective.name,
                  photoUrl: collective.photoUrl,
                  photoThumbnailUrl: collective.photoThumbnailUrl,
                }
              : c,
          ),
          isLoading: false,
          error: null,
        }));

        return collective;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to update collective';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a collective
     */
    deleteCollective: async (collectiveId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await collectivesApi.deleteCollective(collectiveId);

        update((state) => ({
          ...state,
          currentCollective:
            state.currentCollective?.id === collectiveId ? null : state.currentCollective,
          collectives: state.collectives.filter((c) => c.id !== collectiveId),
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
          error instanceof ApiError ? error.message : 'Failed to delete collective';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Add a member to the current collective
     */
    addMember: async (collectiveId: string, input: MembershipInput) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const member = await collectivesApi.addMember(collectiveId, input);

        update((state) => {
          if (state.currentCollective?.id !== collectiveId) {
            return { ...state, isLoading: false, error: null };
          }

          return {
            ...state,
            currentCollective: {
              ...state.currentCollective,
              members: [...state.currentCollective.members, member],
              memberCount: state.currentCollective.memberCount + 1,
              activeMemberCount: state.currentCollective.activeMemberCount + 1,
            },
            isLoading: false,
            error: null,
          };
        });

        return member;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add member';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Remove a member from the current collective
     */
    removeMember: async (collectiveId: string, memberId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await collectivesApi.removeMember(collectiveId, memberId);

        update((state) => {
          if (state.currentCollective?.id !== collectiveId) {
            return { ...state, isLoading: false, error: null };
          }

          const removedMember = state.currentCollective.members.find((m) => m.id === memberId);
          const wasActive = removedMember?.isActive ?? false;

          return {
            ...state,
            currentCollective: {
              ...state.currentCollective,
              members: state.currentCollective.members.filter((m) => m.id !== memberId),
              memberCount: state.currentCollective.memberCount - 1,
              activeMemberCount: wasActive
                ? state.currentCollective.activeMemberCount - 1
                : state.currentCollective.activeMemberCount,
            },
            isLoading: false,
            error: null,
          };
        });
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to remove member';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update a member's role
     */
    updateMemberRole: async (collectiveId: string, memberId: string, input: MembershipUpdate) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const member = await collectivesApi.updateMemberRole(collectiveId, memberId, input);

        update((state) => {
          if (state.currentCollective?.id !== collectiveId) {
            return { ...state, isLoading: false, error: null };
          }

          return {
            ...state,
            currentCollective: {
              ...state.currentCollective,
              members: state.currentCollective.members.map((m) => (m.id === memberId ? member : m)),
            },
            isLoading: false,
            error: null,
          };
        });

        return member;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to update member role';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Deactivate a member
     */
    deactivateMember: async (
      collectiveId: string,
      memberId: string,
      input: MembershipDeactivate = {},
    ) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const member = await collectivesApi.deactivateMember(collectiveId, memberId, input);

        update((state) => {
          if (state.currentCollective?.id !== collectiveId) {
            return { ...state, isLoading: false, error: null };
          }

          const wasActive =
            state.currentCollective.members.find((m) => m.id === memberId)?.isActive ?? false;

          return {
            ...state,
            currentCollective: {
              ...state.currentCollective,
              members: state.currentCollective.members.map((m) => (m.id === memberId ? member : m)),
              activeMemberCount: state.currentCollective.activeMemberCount - (wasActive ? 1 : 0),
            },
            isLoading: false,
            error: null,
          };
        });

        return member;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to deactivate member';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Reactivate a member
     */
    reactivateMember: async (collectiveId: string, memberId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const member = await collectivesApi.reactivateMember(collectiveId, memberId);

        update((state) => {
          if (state.currentCollective?.id !== collectiveId) {
            return { ...state, isLoading: false, error: null };
          }

          const wasInactive = !(
            state.currentCollective.members.find((m) => m.id === memberId)?.isActive ?? true
          );

          return {
            ...state,
            currentCollective: {
              ...state.currentCollective,
              members: state.currentCollective.members.map((m) => (m.id === memberId ? member : m)),
              activeMemberCount: state.currentCollective.activeMemberCount + (wasInactive ? 1 : 0),
            },
            isLoading: false,
            error: null,
          };
        });

        return member;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to reactivate member';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Set filters
     */
    setFilters: (filters: FilterState) => {
      update((state) => ({ ...state, filters }));
    },

    /**
     * Clear current collective
     */
    clearCurrentCollective: () => {
      update((state) => ({ ...state, currentCollective: null }));
    },

    /**
     * Clear the store
     */
    clear: () => {
      set(initialState);
    },
  };
}

export const collectives = createCollectivesStore();

/**
 * Derived store: collectives sorted by name
 */
export const collectivesList = derived(collectives, ($collectives) =>
  [...$collectives.collectives].sort((a, b) => a.name.localeCompare(b.name)),
);

/**
 * Derived store: loading state
 */
export const isLoadingCollectives = derived(collectives, ($collectives) => $collectives.isLoading);

/**
 * Derived store: error state
 */
export const collectivesError = derived(collectives, ($collectives) => $collectives.error);

/**
 * Derived store: collective types
 */
export const collectiveTypes = derived(collectives, ($collectives) => $collectives.collectiveTypes);

/**
 * Derived store: current collective's active members
 */
export const activeMembers = derived(
  collectives,
  ($collectives) => $collectives.currentCollective?.members.filter((m) => m.isActive) ?? [],
);

/**
 * Derived store: current collective's inactive members
 */
export const inactiveMembers = derived(
  collectives,
  ($collectives) => $collectives.currentCollective?.members.filter((m) => !m.isActive) ?? [],
);

// ============================================================================
// Relationship Preview Helper
// ============================================================================

/**
 * Preview relationships that would be created when adding a member
 */
export async function previewMemberRelationships(
  collectiveId: string,
  input: RelationshipPreviewRequest,
): Promise<RelationshipPreviewResponse> {
  return collectivesApi.previewMemberRelationships(collectiveId, input);
}
