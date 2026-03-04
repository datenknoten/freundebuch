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
import { storeAction } from './storeAction.js';

interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface FilterState {
  typeId?: string;
  search?: string;
  includeDeleted?: boolean;
}

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

function createCollectivesStore() {
  const { subscribe, set, update } = writable<CollectivesState>(initialState);

  return {
    subscribe,

    // loadTypes uses isLoadingTypes instead of isLoading, so it stays manual
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

    loadCollectives: (params: CollectiveListParams = {}) =>
      storeAction(
        update,
        () => collectivesApi.listCollectives(params),
        (_state, result) => ({
          collectives: result.collectives,
          pagination: result.pagination,
          filters: {
            typeId: params.typeId,
            search: params.search,
            includeDeleted: params.includeDeleted,
          },
        }),
        'Failed to load collectives',
      ),

    loadCollective: (collectiveId: string) =>
      storeAction(
        update,
        () => collectivesApi.getCollective(collectiveId),
        (_state, collective) => ({ currentCollective: collective }),
        'Failed to load collective',
        () => ({ currentCollective: null }),
      ),

    createCollective: (input: CollectiveInput) =>
      storeAction(
        update,
        () => collectivesApi.createCollective(input),
        (state, collective) => ({
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
        }),
        'Failed to create collective',
      ),

    updateCollective: (collectiveId: string, input: CollectiveUpdate) =>
      storeAction(
        update,
        () => collectivesApi.updateCollective(collectiveId, input),
        (state, collective) => ({
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
        }),
        'Failed to update collective',
      ),

    deleteCollective: (collectiveId: string) =>
      storeAction(
        update,
        () => collectivesApi.deleteCollective(collectiveId),
        (state) => ({
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
        }),
        'Failed to delete collective',
      ),

    addMember: (collectiveId: string, input: MembershipInput) =>
      storeAction(
        update,
        () => collectivesApi.addMember(collectiveId, input),
        (state, member) => {
          if (state.currentCollective?.id !== collectiveId) return {};
          return {
            currentCollective: {
              ...state.currentCollective,
              members: [...state.currentCollective.members, member],
              memberCount: state.currentCollective.memberCount + 1,
              activeMemberCount: state.currentCollective.activeMemberCount + 1,
            },
          };
        },
        'Failed to add member',
      ),

    removeMember: (collectiveId: string, memberId: string) =>
      storeAction(
        update,
        () => collectivesApi.removeMember(collectiveId, memberId),
        (state) => {
          if (state.currentCollective?.id !== collectiveId) return {};
          const removedMember = state.currentCollective.members.find((m) => m.id === memberId);
          const wasActive = removedMember?.isActive ?? false;
          return {
            currentCollective: {
              ...state.currentCollective,
              members: state.currentCollective.members.filter((m) => m.id !== memberId),
              memberCount: state.currentCollective.memberCount - 1,
              activeMemberCount: wasActive
                ? state.currentCollective.activeMemberCount - 1
                : state.currentCollective.activeMemberCount,
            },
          };
        },
        'Failed to remove member',
      ),

    updateMemberRole: (collectiveId: string, memberId: string, input: MembershipUpdate) =>
      storeAction(
        update,
        () => collectivesApi.updateMemberRole(collectiveId, memberId, input),
        (state, member) => {
          if (state.currentCollective?.id !== collectiveId) return {};
          return {
            currentCollective: {
              ...state.currentCollective,
              members: state.currentCollective.members.map((m) => (m.id === memberId ? member : m)),
            },
          };
        },
        'Failed to update member role',
      ),

    deactivateMember: (collectiveId: string, memberId: string, input: MembershipDeactivate = {}) =>
      storeAction(
        update,
        () => collectivesApi.deactivateMember(collectiveId, memberId, input),
        (state, member) => {
          if (state.currentCollective?.id !== collectiveId) return {};
          const wasActive =
            state.currentCollective.members.find((m) => m.id === memberId)?.isActive ?? false;
          return {
            currentCollective: {
              ...state.currentCollective,
              members: state.currentCollective.members.map((m) => (m.id === memberId ? member : m)),
              activeMemberCount: state.currentCollective.activeMemberCount - (wasActive ? 1 : 0),
            },
          };
        },
        'Failed to deactivate member',
      ),

    reactivateMember: (collectiveId: string, memberId: string) =>
      storeAction(
        update,
        () => collectivesApi.reactivateMember(collectiveId, memberId),
        (state, member) => {
          if (state.currentCollective?.id !== collectiveId) return {};
          const wasInactive = !(
            state.currentCollective.members.find((m) => m.id === memberId)?.isActive ?? true
          );
          return {
            currentCollective: {
              ...state.currentCollective,
              members: state.currentCollective.members.map((m) => (m.id === memberId ? member : m)),
              activeMemberCount: state.currentCollective.activeMemberCount + (wasInactive ? 1 : 0),
            },
          };
        },
        'Failed to reactivate member',
      ),

    setFilters: (filters: FilterState) => {
      update((state) => ({ ...state, filters }));
    },

    clearCurrentCollective: () => {
      update((state) => ({ ...state, currentCollective: null }));
    },

    clear: () => {
      set(initialState);
    },
  };
}

export const collectives = createCollectivesStore();

export const collectivesList = derived(collectives, ($collectives) =>
  [...$collectives.collectives].sort((a, b) => a.name.localeCompare(b.name)),
);

export const isLoadingCollectives = derived(collectives, ($collectives) => $collectives.isLoading);

export const collectivesError = derived(collectives, ($collectives) => $collectives.error);

export const collectiveTypes = derived(collectives, ($collectives) => $collectives.collectiveTypes);

export const activeMembers = derived(
  collectives,
  ($collectives) => $collectives.currentCollective?.members.filter((m) => m.isActive) ?? [],
);

export const inactiveMembers = derived(
  collectives,
  ($collectives) => $collectives.currentCollective?.members.filter((m) => !m.isActive) ?? [],
);

// ============================================================================
// Relationship Preview Helper
// ============================================================================

export async function previewMemberRelationships(
  collectiveId: string,
  input: RelationshipPreviewRequest,
  options?: { signal?: AbortSignal },
): Promise<RelationshipPreviewResponse> {
  return collectivesApi.previewMemberRelationships(collectiveId, input, options);
}
