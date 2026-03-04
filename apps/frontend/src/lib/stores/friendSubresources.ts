import type {
  Address,
  AddressInput,
  CircleSummary,
  DateInput,
  Email,
  EmailInput,
  FriendDate,
  MetInfo,
  MetInfoInput,
  Phone,
  PhoneInput,
  ProfessionalHistory,
  ProfessionalHistoryInput,
  Relationship,
  RelationshipInput,
  RelationshipUpdateInput,
  SocialProfile,
  SocialProfileInput,
  Url,
  UrlInput,
} from '$shared';
import * as circlesApi from '../api/circles.js';
import * as friendsApi from '../api/friends.js';
import type { FriendsState } from './friends.js';
import { storeAction } from './storeAction.js';

type FriendsUpdate = (fn: (state: FriendsState) => FriendsState) => void;

/**
 * Creates all subresource CRUD operations for the friends store.
 * Each operation uses storeAction to manage loading/error state.
 */
export function createSubresourceOps(update: FriendsUpdate) {
  return {
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
    // Relationship CRUD Operations
    // =========================================================================

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
  };
}
