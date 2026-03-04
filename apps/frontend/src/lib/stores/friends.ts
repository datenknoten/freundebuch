import { derived, writable } from 'svelte/store';
import type {
  Friend,
  FriendCreateInput,
  FriendListItem,
  FriendSearchResult,
  FriendUpdateInput,
  RelationshipTypesGrouped,
} from '$shared';
import { ApiError } from '../api/auth.js';
import * as friendsApi from '../api/friends.js';
import { createSubresourceOps } from './friendSubresources.js';
import { storeAction } from './storeAction.js';

export type { FriendListFilterState } from './friendListFilter.js';
// Re-export filter store so consumers can still import from '$lib/stores/friends'
export {
  buildSearchParams,
  friendListFilter,
  friendListQuery,
  hasFriendListFilters,
  parseSearchParams,
} from './friendListFilter.js';

export interface FriendsState {
  friends: FriendListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentFriend: Friend | null;
  relationshipTypes: RelationshipTypesGrouped | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: FriendsState = {
  friends: [],
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 0,
  currentFriend: null,
  relationshipTypes: null,
  isLoading: false,
  error: null,
};

function createFriendsStore() {
  const { subscribe, set, update } = writable<FriendsState>(initialState);

  return {
    subscribe,

    // =========================================================================
    // Friend List & CRUD
    // =========================================================================

    loadFriends: (params: friendsApi.FriendListParams = {}) =>
      storeAction(
        update,
        () => friendsApi.listFriends(params),
        (_state, result) => ({
          friends: result.friends,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        }),
        'Failed to load friends',
      ),

    loadFriend: (id: string) =>
      storeAction(
        update,
        () => friendsApi.getFriend(id),
        (_state, friend) => ({ currentFriend: friend }),
        'Failed to load friend',
        () => ({ currentFriend: null }),
      ),

    createFriend: (data: FriendCreateInput) =>
      storeAction(
        update,
        () => friendsApi.createFriend(data),
        (_state, friend) => ({ currentFriend: friend }),
        'Failed to create friend',
      ),

    updateFriend: (id: string, data: FriendUpdateInput) =>
      storeAction(
        update,
        () => friendsApi.updateFriend(id, data),
        (_state, friend) => ({ currentFriend: friend }),
        'Failed to update friend',
      ),

    deleteFriend: (id: string) =>
      storeAction(
        update,
        () => friendsApi.deleteFriend(id),
        (state) => ({
          friends: state.friends.filter((c) => c.id !== id),
          currentFriend: state.currentFriend?.id === id ? null : state.currentFriend,
          total: state.total - 1,
        }),
        'Failed to delete friend',
      ),

    // =========================================================================
    // Relationship Types & Search (non-standard patterns)
    // =========================================================================

    loadRelationshipTypes: async (): Promise<RelationshipTypesGrouped> => {
      let cachedTypes: RelationshipTypesGrouped | null = null;
      update((state) => {
        cachedTypes = state.relationshipTypes;
        return state;
      });

      if (cachedTypes) {
        return cachedTypes;
      }

      try {
        const types = await friendsApi.getRelationshipTypes();

        update((state) => ({
          ...state,
          relationshipTypes: types,
        }));

        return types;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to load relationship types';

        update((state) => ({
          ...state,
          error: errorMessage,
        }));

        throw error;
      }
    },

    searchFriends: async (
      query: string,
      exclude?: string,
      limit?: number,
    ): Promise<FriendSearchResult[]> => {
      try {
        return await friendsApi.searchFriends(query, exclude, limit);
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to search friends';

        update((state) => ({
          ...state,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Subresource Operations (phones, emails, addresses, etc.)
    // =========================================================================
    ...createSubresourceOps(update),

    // =========================================================================
    // Utility Methods
    // =========================================================================

    clearCurrentFriend: () => {
      update((state) => ({ ...state, currentFriend: null }));
    },

    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    reset: () => {
      set(initialState);
    },
  };
}

export const friends = createFriendsStore();

export const isFriendsLoading = derived(friends, ($friends) => $friends.isLoading);

export const currentFriend = derived(friends, ($friends) => $friends.currentFriend);

export const friendList = derived(friends, ($friends) => $friends.friends);

export const relationshipTypes = derived(friends, ($friends) => $friends.relationshipTypes);
