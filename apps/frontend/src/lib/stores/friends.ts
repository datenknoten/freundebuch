import { derived, writable } from 'svelte/store';
import type {
  Address,
  AddressInput,
  CircleSummary,
  DateInput,
  Email,
  EmailInput,
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

/**
 * Friends state interface
 */
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

/**
 * Initial friends state
 */
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

/**
 * Create the friends store
 */
function createFriendsStore() {
  const { subscribe, set, update } = writable<FriendsState>(initialState);

  return {
    subscribe,

    /**
     * Load paginated friend list
     */
    loadFriends: async (params: friendsApi.FriendListParams = {}) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await friendsApi.listFriends(params);

        update((state) => ({
          ...state,
          friends: result.friends,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to load friends';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Load a single friend by ID
     */
    loadFriend: async (id: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const friend = await friendsApi.getFriend(id);

        update((state) => ({
          ...state,
          currentFriend: friend,
          isLoading: false,
          error: null,
        }));

        return friend;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to load friend';

        update((state) => ({
          ...state,
          currentFriend: null,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Create a new friend
     */
    createFriend: async (data: FriendCreateInput) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const friend = await friendsApi.createFriend(data);

        update((state) => ({
          ...state,
          currentFriend: friend,
          isLoading: false,
          error: null,
        }));

        return friend;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to create friend';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update an existing friend
     */
    updateFriend: async (id: string, data: FriendUpdateInput) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const friend = await friendsApi.updateFriend(id, data);

        update((state) => ({
          ...state,
          currentFriend: friend,
          isLoading: false,
          error: null,
        }));

        return friend;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to update friend';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a friend
     */
    deleteFriend: async (id: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deleteFriend(id);

        update((state) => ({
          ...state,
          friends: state.friends.filter((c) => c.id !== id),
          currentFriend: state.currentFriend?.id === id ? null : state.currentFriend,
          total: state.total - 1,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete friend';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Phone Operations
    // =========================================================================

    /**
     * Add a phone to the current friend
     */
    addPhone: async (friendId: string, data: PhoneInput): Promise<Phone> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const phone = await friendsApi.addPhone(friendId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, phones: [...state.currentFriend.phones, phone] }
            : null,
          isLoading: false,
          error: null,
        }));

        return phone;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add phone';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update a phone for the current friend
     */
    updatePhone: async (
      friendId: string,
      phoneId: string,
      data: Partial<PhoneInput>,
    ): Promise<Phone> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const phone = await friendsApi.updatePhone(friendId, phoneId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                phones: state.currentFriend.phones.map((p) => (p.id === phoneId ? phone : p)),
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return phone;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to update phone';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a phone from the current friend
     */
    deletePhone: async (friendId: string, phoneId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deletePhone(friendId, phoneId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                phones: state.currentFriend.phones.filter((p) => p.id !== phoneId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete phone';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Email Operations
    // =========================================================================

    /**
     * Add an email to the current friend
     */
    addEmail: async (friendId: string, data: EmailInput): Promise<Email> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const email = await friendsApi.addEmail(friendId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, emails: [...state.currentFriend.emails, email] }
            : null,
          isLoading: false,
          error: null,
        }));

        return email;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add email';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update an email for the current friend
     */
    updateEmail: async (
      friendId: string,
      emailId: string,
      data: Partial<EmailInput>,
    ): Promise<Email> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const email = await friendsApi.updateEmail(friendId, emailId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                emails: state.currentFriend.emails.map((e) => (e.id === emailId ? email : e)),
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return email;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to update email';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete an email from the current friend
     */
    deleteEmail: async (friendId: string, emailId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deleteEmail(friendId, emailId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                emails: state.currentFriend.emails.filter((e) => e.id !== emailId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete email';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Address Operations
    // =========================================================================

    /**
     * Add an address to the current friend
     */
    addAddress: async (friendId: string, data: AddressInput): Promise<Address> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const address = await friendsApi.addAddress(friendId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, addresses: [...state.currentFriend.addresses, address] }
            : null,
          isLoading: false,
          error: null,
        }));

        return address;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add address';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update an address for the current friend
     */
    updateAddress: async (
      friendId: string,
      addressId: string,
      data: Partial<AddressInput>,
    ): Promise<Address> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const address = await friendsApi.updateAddress(friendId, addressId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                addresses: state.currentFriend.addresses.map((a) =>
                  a.id === addressId ? address : a,
                ),
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return address;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to update address';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete an address from the current friend
     */
    deleteAddress: async (friendId: string, addressId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deleteAddress(friendId, addressId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                addresses: state.currentFriend.addresses.filter((a) => a.id !== addressId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete address';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // URL Operations
    // =========================================================================

    /**
     * Add a URL to the current friend
     */
    addUrl: async (friendId: string, data: UrlInput): Promise<Url> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const url = await friendsApi.addUrl(friendId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, urls: [...state.currentFriend.urls, url] }
            : null,
          isLoading: false,
          error: null,
        }));

        return url;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add URL';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update a URL for the current friend
     */
    updateUrl: async (friendId: string, urlId: string, data: Partial<UrlInput>): Promise<Url> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const url = await friendsApi.updateUrl(friendId, urlId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                urls: state.currentFriend.urls.map((u) => (u.id === urlId ? url : u)),
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return url;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to update URL';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a URL from the current friend
     */
    deleteUrl: async (friendId: string, urlId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deleteUrl(friendId, urlId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                urls: state.currentFriend.urls.filter((u) => u.id !== urlId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete URL';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Photo Operations
    // =========================================================================

    /**
     * Upload a photo for the current friend
     */
    uploadPhoto: async (friendId: string, file: File) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await friendsApi.uploadPhoto(friendId, file);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                photoUrl: result.photoUrl,
                photoThumbnailUrl: result.photoThumbnailUrl,
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to upload photo';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete the current friend's photo
     */
    deletePhoto: async (friendId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deletePhoto(friendId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                photoUrl: undefined,
                photoThumbnailUrl: undefined,
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete photo';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Date Operations (Epic 1B)
    // =========================================================================

    /**
     * Add an important date to the current friend
     */
    addDate: async (friendId: string, data: DateInput): Promise<FriendDate> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const date = await friendsApi.addDate(friendId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, dates: [...(state.currentFriend.dates ?? []), date] }
            : null,
          isLoading: false,
          error: null,
        }));

        return date;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add date';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update an important date
     */
    updateDate: async (friendId: string, dateId: string, data: DateInput): Promise<FriendDate> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const date = await friendsApi.updateDate(friendId, dateId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                dates: (state.currentFriend.dates ?? []).map((d) => (d.id === dateId ? date : d)),
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return date;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to update date';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete an important date from the current friend
     */
    deleteDate: async (friendId: string, dateId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deleteDate(friendId, dateId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                dates: (state.currentFriend.dates ?? []).filter((d) => d.id !== dateId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete date';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Met Info Operations (Epic 1B)
    // =========================================================================

    /**
     * Set or update how/where met information for the current friend
     */
    setMetInfo: async (friendId: string, data: MetInfoInput): Promise<MetInfo> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const metInfo = await friendsApi.setMetInfo(friendId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend ? { ...state.currentFriend, metInfo } : null,
          isLoading: false,
          error: null,
        }));

        return metInfo;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to set met info';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete how/where met information from the current friend
     */
    deleteMetInfo: async (friendId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deleteMetInfo(friendId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? { ...state.currentFriend, metInfo: undefined }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to delete met info';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Social Profile Operations (Epic 1B)
    // =========================================================================

    /**
     * Add a social profile to the current friend
     */
    addSocialProfile: async (
      friendId: string,
      data: SocialProfileInput,
    ): Promise<SocialProfile> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const profile = await friendsApi.addSocialProfile(friendId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                socialProfiles: [...(state.currentFriend.socialProfiles ?? []), profile],
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return profile;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to add social profile';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update a social profile
     */
    updateSocialProfile: async (
      friendId: string,
      profileId: string,
      data: SocialProfileInput,
    ): Promise<SocialProfile> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const profile = await friendsApi.updateSocialProfile(friendId, profileId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                socialProfiles: (state.currentFriend.socialProfiles ?? []).map((p) =>
                  p.id === profileId ? profile : p,
                ),
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return profile;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to update social profile';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a social profile from the current friend
     */
    deleteSocialProfile: async (friendId: string, profileId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deleteSocialProfile(friendId, profileId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                socialProfiles: (state.currentFriend.socialProfiles ?? []).filter(
                  (p) => p.id !== profileId,
                ),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to delete social profile';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Relationship Operations (Epic 1D)
    // =========================================================================

    /**
     * Load relationship types (cached in store)
     */
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

    /**
     * Search friends by name (for autocomplete)
     */
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

    /**
     * Add a relationship to the current friend
     */
    addRelationship: async (friendId: string, data: RelationshipInput): Promise<Relationship> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const relationship = await friendsApi.addRelationship(friendId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                relationships: [...(state.currentFriend.relationships ?? []), relationship],
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return relationship;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to add relationship';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update a relationship
     */
    updateRelationship: async (
      friendId: string,
      relationshipId: string,
      data: RelationshipUpdateInput,
    ): Promise<Relationship> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const relationship = await friendsApi.updateRelationship(friendId, relationshipId, data);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                relationships: (state.currentFriend.relationships ?? []).map((r) =>
                  r.id === relationshipId ? relationship : r,
                ),
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return relationship;
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to update relationship';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a relationship from the current friend
     */
    deleteRelationship: async (friendId: string, relationshipId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await friendsApi.deleteRelationship(friendId, relationshipId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                relationships: (state.currentFriend.relationships ?? []).filter(
                  (r) => r.id !== relationshipId,
                ),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to delete relationship';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Circle Operations (Epic 4)
    // =========================================================================

    /**
     * Add the current friend to a circle
     */
    addCircle: async (friendId: string, circleId: string): Promise<CircleSummary> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const circle = await circlesApi.addFriendToCircle(friendId, circleId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                circles: [...state.currentFriend.circles, circle],
              }
            : null,
          isLoading: false,
          error: null,
        }));

        return circle;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to add to circle';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Remove the current friend from a circle
     */
    removeCircle: async (friendId: string, circleId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await circlesApi.removeFriendFromCircle(friendId, circleId);

        update((state) => ({
          ...state,
          currentFriend: state.currentFriend
            ? {
                ...state.currentFriend,
                circles: state.currentFriend.circles.filter((c) => c.id !== circleId),
              }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to remove from circle';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    // =========================================================================
    // Utility Methods
    // =========================================================================

    /**
     * Clear the current friend
     */
    clearCurrentFriend: () => {
      update((state) => ({ ...state, currentFriend: null }));
    },

    /**
     * Clear any errors
     */
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Reset the store to initial state
     */
    reset: () => {
      set(initialState);
    },
  };
}

/**
 * The global friends store
 */
export const friends = createFriendsStore();

/**
 * Derived store for loading state
 */
export const isFriendsLoading = derived(friends, ($friends) => $friends.isLoading);

/**
 * Derived store for current friend
 */
export const currentFriend = derived(friends, ($friends) => $friends.currentFriend);

/**
 * Derived store for friend list
 */
export const friendList = derived(friends, ($friends) => $friends.friends);

/**
 * Derived store for relationship types
 */
export const relationshipTypes = derived(friends, ($friends) => $friends.relationshipTypes);
