import { derived, writable } from 'svelte/store';
import type {
  Address,
  AddressInput,
  CircleSummary,
  DateInput,
  Email,
  EmailInput,
  FacetFilters,
  Friend,
  FriendCreateInput,
  FriendDate,
  FriendListItem,
  FriendSearchResult,
  FriendUpdateInput,
  MetInfo,
  MetInfoInput,
  Phone,
  PhoneInput,
  ProfessionalHistory,
  ProfessionalHistoryInput,
  Relationship,
  RelationshipInput,
  RelationshipTypesGrouped,
  RelationshipUpdateInput,
  SocialProfile,
  SocialProfileInput,
  Url,
  UrlInput,
} from '$shared';
import { ApiError } from '../api/auth.js';
import * as circlesApi from '../api/circles.js';
import * as friendsApi from '../api/friends.js';
import { storeAction } from './storeAction.js';

interface FriendsState {
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
    // Friend CRUD
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
    // Phone Operations
    // =========================================================================

    addPhone: (friendId: string, data: PhoneInput): Promise<Phone> =>
      storeAction(
        update,
        () => friendsApi.addPhone(friendId, data),
        (state, phone) => ({
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, phones: [...state.currentFriend.phones, phone] }
            : null,
        }),
        'Failed to add phone',
      ),

    updatePhone: (friendId: string, phoneId: string, data: Partial<PhoneInput>): Promise<Phone> =>
      storeAction(
        update,
        () => friendsApi.updatePhone(friendId, phoneId, data),
        (state, phone) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                phones: state.currentFriend.phones.map((p) => (p.id === phoneId ? phone : p)),
              }
            : null,
        }),
        'Failed to update phone',
      ),

    deletePhone: (friendId: string, phoneId: string) =>
      storeAction(
        update,
        () => friendsApi.deletePhone(friendId, phoneId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                phones: state.currentFriend.phones.filter((p) => p.id !== phoneId),
              }
            : null,
        }),
        'Failed to delete phone',
      ),

    // =========================================================================
    // Email Operations
    // =========================================================================

    addEmail: (friendId: string, data: EmailInput): Promise<Email> =>
      storeAction(
        update,
        () => friendsApi.addEmail(friendId, data),
        (state, email) => ({
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, emails: [...state.currentFriend.emails, email] }
            : null,
        }),
        'Failed to add email',
      ),

    updateEmail: (friendId: string, emailId: string, data: Partial<EmailInput>): Promise<Email> =>
      storeAction(
        update,
        () => friendsApi.updateEmail(friendId, emailId, data),
        (state, email) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                emails: state.currentFriend.emails.map((e) => (e.id === emailId ? email : e)),
              }
            : null,
        }),
        'Failed to update email',
      ),

    deleteEmail: (friendId: string, emailId: string) =>
      storeAction(
        update,
        () => friendsApi.deleteEmail(friendId, emailId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                emails: state.currentFriend.emails.filter((e) => e.id !== emailId),
              }
            : null,
        }),
        'Failed to delete email',
      ),

    // =========================================================================
    // Address Operations
    // =========================================================================

    addAddress: (friendId: string, data: AddressInput): Promise<Address> =>
      storeAction(
        update,
        () => friendsApi.addAddress(friendId, data),
        (state, address) => ({
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, addresses: [...state.currentFriend.addresses, address] }
            : null,
        }),
        'Failed to add address',
      ),

    updateAddress: (
      friendId: string,
      addressId: string,
      data: Partial<AddressInput>,
    ): Promise<Address> =>
      storeAction(
        update,
        () => friendsApi.updateAddress(friendId, addressId, data),
        (state, address) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                addresses: state.currentFriend.addresses.map((a) =>
                  a.id === addressId ? address : a,
                ),
              }
            : null,
        }),
        'Failed to update address',
      ),

    deleteAddress: (friendId: string, addressId: string) =>
      storeAction(
        update,
        () => friendsApi.deleteAddress(friendId, addressId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                addresses: state.currentFriend.addresses.filter((a) => a.id !== addressId),
              }
            : null,
        }),
        'Failed to delete address',
      ),

    // =========================================================================
    // URL Operations
    // =========================================================================

    addUrl: (friendId: string, data: UrlInput): Promise<Url> =>
      storeAction(
        update,
        () => friendsApi.addUrl(friendId, data),
        (state, url) => ({
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, urls: [...state.currentFriend.urls, url] }
            : null,
        }),
        'Failed to add URL',
      ),

    updateUrl: (friendId: string, urlId: string, data: Partial<UrlInput>): Promise<Url> =>
      storeAction(
        update,
        () => friendsApi.updateUrl(friendId, urlId, data),
        (state, url) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                urls: state.currentFriend.urls.map((u) => (u.id === urlId ? url : u)),
              }
            : null,
        }),
        'Failed to update URL',
      ),

    deleteUrl: (friendId: string, urlId: string) =>
      storeAction(
        update,
        () => friendsApi.deleteUrl(friendId, urlId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                urls: state.currentFriend.urls.filter((u) => u.id !== urlId),
              }
            : null,
        }),
        'Failed to delete URL',
      ),

    // =========================================================================
    // Photo Operations
    // =========================================================================

    uploadPhoto: (friendId: string, file: File) =>
      storeAction(
        update,
        () => friendsApi.uploadPhoto(friendId, file),
        (state, result) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                photoUrl: result.photoUrl,
                photoThumbnailUrl: result.photoThumbnailUrl,
              }
            : null,
        }),
        'Failed to upload photo',
      ),

    deletePhoto: (friendId: string) =>
      storeAction(
        update,
        () => friendsApi.deletePhoto(friendId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                photoUrl: undefined,
                photoThumbnailUrl: undefined,
              }
            : null,
        }),
        'Failed to delete photo',
      ),

    // =========================================================================
    // Date Operations
    // =========================================================================

    addDate: (friendId: string, data: DateInput): Promise<FriendDate> =>
      storeAction(
        update,
        () => friendsApi.addDate(friendId, data),
        (state, date) => ({
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, dates: [...(state.currentFriend.dates ?? []), date] }
            : null,
        }),
        'Failed to add date',
      ),

    updateDate: (friendId: string, dateId: string, data: DateInput): Promise<FriendDate> =>
      storeAction(
        update,
        () => friendsApi.updateDate(friendId, dateId, data),
        (state, date) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                dates: (state.currentFriend.dates ?? []).map((d) => (d.id === dateId ? date : d)),
              }
            : null,
        }),
        'Failed to update date',
      ),

    deleteDate: (friendId: string, dateId: string) =>
      storeAction(
        update,
        () => friendsApi.deleteDate(friendId, dateId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                dates: (state.currentFriend.dates ?? []).filter((d) => d.id !== dateId),
              }
            : null,
        }),
        'Failed to delete date',
      ),

    // =========================================================================
    // Met Info Operations
    // =========================================================================

    setMetInfo: (friendId: string, data: MetInfoInput): Promise<MetInfo> =>
      storeAction(
        update,
        () => friendsApi.setMetInfo(friendId, data),
        (state, metInfo) => ({
          currentFriend: state.currentFriend ? { ...state.currentFriend, metInfo } : null,
        }),
        'Failed to set met info',
      ),

    deleteMetInfo: (friendId: string) =>
      storeAction(
        update,
        () => friendsApi.deleteMetInfo(friendId),
        (state) => ({
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, metInfo: undefined }
            : null,
        }),
        'Failed to delete met info',
      ),

    // =========================================================================
    // Social Profile Operations
    // =========================================================================

    addSocialProfile: (friendId: string, data: SocialProfileInput): Promise<SocialProfile> =>
      storeAction(
        update,
        () => friendsApi.addSocialProfile(friendId, data),
        (state, profile) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                socialProfiles: [...(state.currentFriend.socialProfiles ?? []), profile],
              }
            : null,
        }),
        'Failed to add social profile',
      ),

    updateSocialProfile: (
      friendId: string,
      profileId: string,
      data: SocialProfileInput,
    ): Promise<SocialProfile> =>
      storeAction(
        update,
        () => friendsApi.updateSocialProfile(friendId, profileId, data),
        (state, profile) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                socialProfiles: (state.currentFriend.socialProfiles ?? []).map((p) =>
                  p.id === profileId ? profile : p,
                ),
              }
            : null,
        }),
        'Failed to update social profile',
      ),

    deleteSocialProfile: (friendId: string, profileId: string) =>
      storeAction(
        update,
        () => friendsApi.deleteSocialProfile(friendId, profileId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                socialProfiles: (state.currentFriend.socialProfiles ?? []).filter(
                  (p) => p.id !== profileId,
                ),
              }
            : null,
        }),
        'Failed to delete social profile',
      ),

    // =========================================================================
    // Professional History Operations
    // =========================================================================

    addProfessionalHistory: (
      friendId: string,
      data: ProfessionalHistoryInput,
    ): Promise<ProfessionalHistory> =>
      storeAction(
        update,
        () => friendsApi.addProfessionalHistory(friendId, data),
        (state, history) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                professionalHistory: [...(state.currentFriend.professionalHistory ?? []), history],
              }
            : null,
        }),
        'Failed to add professional history',
      ),

    updateProfessionalHistory: (
      friendId: string,
      historyId: string,
      data: ProfessionalHistoryInput,
    ): Promise<ProfessionalHistory> =>
      storeAction(
        update,
        () => friendsApi.updateProfessionalHistory(friendId, historyId, data),
        (state, history) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                professionalHistory: (state.currentFriend.professionalHistory ?? []).map((h) =>
                  h.id === historyId ? history : h,
                ),
              }
            : null,
        }),
        'Failed to update professional history',
      ),

    deleteProfessionalHistory: (friendId: string, historyId: string) =>
      storeAction(
        update,
        () => friendsApi.deleteProfessionalHistory(friendId, historyId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                professionalHistory: (state.currentFriend.professionalHistory ?? []).filter(
                  (h) => h.id !== historyId,
                ),
              }
            : null,
        }),
        'Failed to delete professional history',
      ),

    // =========================================================================
    // Relationship Operations
    // =========================================================================

    loadRelationshipTypes: async (): Promise<RelationshipTypesGrouped> => {
      // Return cached types if available
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

    addRelationship: (friendId: string, data: RelationshipInput): Promise<Relationship> =>
      storeAction(
        update,
        () => friendsApi.addRelationship(friendId, data),
        (state, relationship) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                relationships: [...(state.currentFriend.relationships ?? []), relationship],
              }
            : null,
        }),
        'Failed to add relationship',
      ),

    updateRelationship: (
      friendId: string,
      relationshipId: string,
      data: RelationshipUpdateInput,
    ): Promise<Relationship> =>
      storeAction(
        update,
        () => friendsApi.updateRelationship(friendId, relationshipId, data),
        (state, relationship) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                relationships: (state.currentFriend.relationships ?? []).map((r) =>
                  r.id === relationshipId ? relationship : r,
                ),
              }
            : null,
        }),
        'Failed to update relationship',
      ),

    deleteRelationship: (friendId: string, relationshipId: string) =>
      storeAction(
        update,
        () => friendsApi.deleteRelationship(friendId, relationshipId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                relationships: (state.currentFriend.relationships ?? []).filter(
                  (r) => r.id !== relationshipId,
                ),
              }
            : null,
        }),
        'Failed to delete relationship',
      ),

    // =========================================================================
    // Circle Operations
    // =========================================================================

    addCircle: (friendId: string, circleId: string): Promise<CircleSummary> =>
      storeAction(
        update,
        () => circlesApi.addFriendToCircle(friendId, circleId),
        (state, circle) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                circles: [...state.currentFriend.circles, circle],
              }
            : null,
        }),
        'Failed to add to circle',
      ),

    removeCircle: (friendId: string, circleId: string) =>
      storeAction(
        update,
        () => circlesApi.removeFriendFromCircle(friendId, circleId),
        (state) => ({
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                circles: state.currentFriend.circles.filter((c) => c.id !== circleId),
              }
            : null,
        }),
        'Failed to remove from circle',
      ),

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

// =============================================================================
// Friend List Filter State (persists search/filter state across navigation)
// =============================================================================

interface FriendListFilterState {
  query: string;
  filters: FacetFilters;
}

const initialFilterState: FriendListFilterState = {
  query: '',
  filters: {},
};

function createFriendListFilterStore() {
  const { subscribe, set, update } = writable<FriendListFilterState>(initialFilterState);

  return {
    subscribe,

    setQuery: (query: string) => {
      update((state) => ({ ...state, query }));
    },

    setFilters: (filters: FacetFilters) => {
      update((state) => ({ ...state, filters }));
    },

    setState: (query: string, filters: FacetFilters) => {
      set({ query, filters });
    },

    clear: () => {
      set(initialFilterState);
    },

    buildSearchParams: (state: FriendListFilterState): URLSearchParams => {
      const params = new URLSearchParams();

      if (state.query.trim()) {
        params.set('q', state.query.trim());
      }

      for (const [key, values] of Object.entries(state.filters)) {
        if (values && values.length > 0) {
          params.set(key, values.join(','));
        }
      }

      return params;
    },

    parseSearchParams: (params: URLSearchParams): FriendListFilterState => {
      const query = params.get('q') ?? '';
      const filters: FacetFilters = {};

      const stringArrayKeys = [
        'country',
        'city',
        'organization',
        'job_title',
        'department',
        'circles',
      ] as const;
      for (const key of stringArrayKeys) {
        const value = params.get(key);
        if (value) {
          filters[key] = value.split(',');
        }
      }

      const relationshipCategory = params.get('relationship_category');
      if (relationshipCategory) {
        filters.relationship_category = relationshipCategory.split(',') as (
          | 'family'
          | 'professional'
          | 'social'
        )[];
      }

      return { query, filters };
    },
  };
}

export const friendListFilter = createFriendListFilterStore();

export const friendListQuery = derived(friendListFilter, ($filter) => $filter.query);

export const hasFriendListFilters = derived(
  friendListFilter,
  ($filter) =>
    $filter.query.trim().length > 0 ||
    Object.values($filter.filters).some((arr) => arr && arr.length > 0),
);
