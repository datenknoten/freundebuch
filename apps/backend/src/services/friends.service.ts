import type {
  Address,
  AddressInput,
  AddressType,
  DateInput,
  DateType,
  Email,
  EmailInput,
  EmailType,
  FacetedSearchOptions,
  FacetedSearchResponse,
  FacetGroups,
  FacetValue,
  Friend,
  FriendCreateInput,
  FriendDate,
  FriendListItem,
  FriendListOptions,
  FriendSearchResult,
  FriendUpdateInput,
  GlobalSearchResult,
  MetInfo,
  MetInfoInput,
  NetworkGraphData,
  NetworkGraphLink,
  NetworkGraphNode,
  PaginatedFriendList,
  PaginatedSearchResponse,
  Phone,
  PhoneInput,
  PhoneType,
  ProfessionalHistory,
  ProfessionalHistoryInput,
  Relationship,
  RelationshipCategory,
  RelationshipInput,
  RelationshipType,
  RelationshipTypeId,
  RelationshipTypesGrouped,
  RelationshipUpdateInput,
  SearchOptions,
  SocialPlatform,
  SocialProfile,
  SocialProfileInput,
  UpcomingDate,
  Url,
  UrlInput,
  UrlType,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  clearPrimaryAddress,
  createAddress,
  deleteAddress,
  type IGetAddressesByFriendIdResult,
  updateAddress,
} from '../models/queries/friend-addresses.queries.js';
import {
  getCircleFacetCounts,
  type IGetCircleFacetCountsResult,
} from '../models/queries/friend-circles.queries.js';
import {
  countBirthdaysForFriend,
  createDate,
  deleteDate,
  getUpcomingDates,
  type IGetDatesByFriendIdResult,
  type IGetUpcomingDatesResult,
  updateDate,
} from '../models/queries/friend-dates.queries.js';
import {
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  type IGetEmailsByFriendIdResult,
  updateEmail,
} from '../models/queries/friend-emails.queries.js';
import {
  deleteMetInfo,
  type IGetMetInfoByFriendIdResult,
  upsertMetInfo,
} from '../models/queries/friend-met-info.queries.js';
import {
  clearPrimaryPhone,
  createPhone,
  deletePhone,
  type IGetPhonesByFriendIdResult,
  updatePhone,
} from '../models/queries/friend-phones.queries.js';
import {
  clearPrimaryProfessionalHistory,
  createProfessionalHistory,
  deleteProfessionalHistory,
  type IGetProfessionalHistoryByFriendIdResult,
  updateProfessionalHistory,
} from '../models/queries/friend-professional-history.queries.js';
import {
  createInverseRelationship,
  createRelationship,
  deleteInverseRelationship,
  deleteRelationship,
  getAllRelationshipTypes,
  getNetworkGraphLinks,
  getNetworkGraphNodes,
  getRelationshipById,
  type IGetRelationshipsByFriendIdResult,
  searchFriends,
  updateRelationship,
} from '../models/queries/friend-relationships.queries.js';
import {
  createSocialProfile,
  deleteSocialProfile,
  type IGetSocialProfilesByFriendIdResult,
  updateSocialProfile,
} from '../models/queries/friend-social-profiles.queries.js';
import {
  createUrl,
  deleteUrl,
  type IGetUrlsByFriendIdResult,
  updateUrl,
} from '../models/queries/friend-urls.queries.js';
import {
  archiveFriend,
  createFriend,
  getFriendById,
  getFriendsByUserId,
  type IGetFriendByIdResult,
  type IGetFriendsByUserIdResult,
  softDeleteFriend,
  toggleFavorite,
  unarchiveFriend,
  updateFriend,
  updateFriendPhoto,
} from '../models/queries/friends.queries.js';
import {
  addRecentSearch,
  clearRecentSearches,
  deleteRecentSearch,
  facetedSearch,
  filterOnlyList,
  fullTextSearchFriends,
  getAllFacetCounts,
  getFacetCounts,
  getRecentSearches,
  type IFacetedSearchResult,
  type IFilterOnlyListResult,
  type IFullTextSearchFriendsResult,
  type IGetFacetCountsResult,
  type IPaginatedFullTextSearchResult,
  paginatedFullTextSearch,
} from '../models/queries/search.queries.js';
import { BirthdayAlreadyExistsError, FriendCreationError } from '../utils/errors.js';
import { sanitizeSearchHeadline } from '../utils/security.js';

/**
 * Escape special characters for PostgreSQL LIKE/ILIKE patterns.
 * Prevents SQL injection by escaping %, _, and \ characters.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Create a wildcard query for ILIKE patterns.
 * Escapes special characters and wraps with % for partial matching.
 */
function createWildcardQuery(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}

export class FriendsService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(db: pg.Pool, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * List friends for a user with pagination and sorting
   * Uses a single query with CTE to get both data and total count
   */
  async listFriends(
    userExternalId: string,
    options: FriendListOptions,
  ): Promise<PaginatedFriendList> {
    this.logger.debug({ userExternalId, options }, 'Listing friends');

    const offset = (options.page - 1) * options.pageSize;

    // Epic 4: Determine archived filter value
    // 'exclude' (default), 'include', or 'only'
    let archivedFilter: string = 'exclude';
    if (options.archived === true) {
      archivedFilter = 'include';
    } else if (options.archived === 'only') {
      archivedFilter = 'only';
    }

    const friends = await getFriendsByUserId.run(
      {
        userExternalId,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
        pageSize: options.pageSize,
        offset,
        // Epic 4: Archive and favorites filters
        archivedFilter,
        favoritesOnly: options.favorites ?? false,
      },
      this.db,
    );

    // Total count is included in each row via CROSS JOIN with the count CTE
    const total = friends[0]?.total_count ?? 0;

    return {
      friends: friends.map((c) => this.mapFriendListItem(c)),
      total,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil(total / options.pageSize),
    };
  }

  /**
   * Get a single friend by ID with all related data
   * Uses a single query with json_agg subqueries for efficiency
   */
  async getFriendById(userExternalId: string, friendExternalId: string): Promise<Friend | null> {
    this.logger.debug({ userExternalId, friendExternalId }, 'Getting friend');

    const [friend] = await getFriendById.run({ userExternalId, friendExternalId }, this.db);

    if (!friend) {
      return null;
    }

    return this.mapFriendWithEmbeddedRelations(friend);
  }

  /**
   * Create a new friend with optional phones, emails, addresses, URLs, dates, met info, and social profiles
   */
  async createFriend(userExternalId: string, data: FriendCreateInput): Promise<Friend> {
    this.logger.info({ userExternalId, displayName: data.display_name }, 'Creating friend');

    const [friend] = await createFriend.run(
      {
        userExternalId,
        displayName: data.display_name,
        nickname: data.nickname ?? null,
        namePrefix: data.name_prefix ?? null,
        nameFirst: data.name_first ?? null,
        nameMiddle: data.name_middle ?? null,
        nameLast: data.name_last ?? null,
        nameSuffix: data.name_suffix ?? null,
        maidenName: data.maiden_name ?? null,
        interests: data.interests ?? null,
      },
      this.db,
    );

    if (!friend) {
      this.logger.error({ userExternalId }, 'Failed to create friend');
      throw new FriendCreationError();
    }

    const friendExternalId = friend.external_id;

    // Create sub-resources in parallel (Epic 1A + 1B)
    const [phones, emails, addresses, urls, dates, socialProfiles, professionalHistory] =
      await Promise.all([
        this.createPhones(userExternalId, friendExternalId, data.phones ?? []),
        this.createEmails(userExternalId, friendExternalId, data.emails ?? []),
        this.createAddresses(userExternalId, friendExternalId, data.addresses ?? []),
        this.createUrls(userExternalId, friendExternalId, data.urls ?? []),
        this.createDates(userExternalId, friendExternalId, data.dates ?? []),
        this.createSocialProfiles(userExternalId, friendExternalId, data.social_profiles ?? []),
        this.createProfessionalHistories(
          userExternalId,
          friendExternalId,
          data.professional_history ?? [],
        ),
      ]);

    // Create met info if provided (single record)
    let metInfo: MetInfo | undefined;
    if (data.met_info) {
      metInfo =
        (await this.setMetInfo(userExternalId, friendExternalId, data.met_info)) ?? undefined;
    }

    this.logger.info(
      { friendExternalId, displayName: data.display_name },
      'Friend created successfully',
    );

    return {
      id: friend.external_id,
      displayName: friend.display_name,
      nickname: friend.nickname ?? undefined,
      namePrefix: friend.name_prefix ?? undefined,
      nameFirst: friend.name_first ?? undefined,
      nameMiddle: friend.name_middle ?? undefined,
      nameLast: friend.name_last ?? undefined,
      nameSuffix: friend.name_suffix ?? undefined,
      maidenName: friend.maiden_name ?? undefined,
      photoUrl: friend.photo_url ?? undefined,
      photoThumbnailUrl: friend.photo_thumbnail_url ?? undefined,
      professionalHistory,
      interests: friend.interests ?? undefined,
      phones,
      emails,
      addresses,
      urls,
      dates,
      metInfo,
      socialProfiles,
      relationships: [], // New friends have no relationships yet
      // Epic 4: Organization fields (defaults for new friends)
      isFavorite: false,
      circles: [],
      createdAt: friend.created_at.toISOString(),
      updatedAt: friend.updated_at.toISOString(),
    };
  }

  /**
   * Update an existing friend
   */
  async updateFriend(
    userExternalId: string,
    friendExternalId: string,
    data: FriendUpdateInput,
  ): Promise<Friend | null> {
    this.logger.info({ userExternalId, friendExternalId }, 'Updating friend');

    const [updated] = await updateFriend.run(
      {
        userExternalId,
        friendExternalId,
        displayName: data.display_name ?? null,
        updateNickname: 'nickname' in data,
        nickname: data.nickname ?? null,
        updateNamePrefix: 'name_prefix' in data,
        namePrefix: data.name_prefix ?? null,
        updateNameFirst: 'name_first' in data,
        nameFirst: data.name_first ?? null,
        updateNameMiddle: 'name_middle' in data,
        nameMiddle: data.name_middle ?? null,
        updateNameLast: 'name_last' in data,
        nameLast: data.name_last ?? null,
        updateNameSuffix: 'name_suffix' in data,
        nameSuffix: data.name_suffix ?? null,
        updateMaidenName: 'maiden_name' in data,
        maidenName: data.maiden_name ?? null,
        updateInterests: 'interests' in data,
        interests: data.interests ?? null,
      },
      this.db,
    );

    if (!updated) {
      return null;
    }

    this.logger.info({ friendExternalId }, 'Friend updated successfully');

    // Fetch the full friend with related data using the optimized query
    return this.getFriendById(userExternalId, friendExternalId);
  }

  /**
   * Soft delete a friend
   */
  async deleteFriend(userExternalId: string, friendExternalId: string): Promise<boolean> {
    this.logger.info({ userExternalId, friendExternalId }, 'Deleting friend');

    const result = await softDeleteFriend.run({ userExternalId, friendExternalId }, this.db);

    if (result.length === 0) {
      return false;
    }

    this.logger.info({ friendExternalId }, 'Friend deleted successfully');
    return true;
  }

  // ============================================================================
  // Phone Methods
  // ============================================================================

  async addPhone(
    userExternalId: string,
    friendExternalId: string,
    data: PhoneInput,
  ): Promise<Phone | null> {
    this.logger.debug({ friendExternalId }, 'Adding phone');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryPhone.run({ userExternalId, friendExternalId }, this.db);
    }

    const [phone] = await createPhone.run(
      {
        userExternalId,
        friendExternalId,
        phoneNumber: data.phone_number,
        phoneType: data.phone_type,
        label: data.label ?? null,
        isPrimary: data.is_primary ?? false,
      },
      this.db,
    );

    if (!phone) {
      return null;
    }

    return this.mapPhone(phone);
  }

  async updatePhone(
    userExternalId: string,
    friendExternalId: string,
    phoneExternalId: string,
    data: PhoneInput,
  ): Promise<Phone | null> {
    this.logger.debug({ friendExternalId, phoneExternalId }, 'Updating phone');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryPhone.run({ userExternalId, friendExternalId }, this.db);
    }

    const [phone] = await updatePhone.run(
      {
        userExternalId,
        friendExternalId,
        phoneExternalId,
        phoneNumber: data.phone_number,
        phoneType: data.phone_type,
        label: data.label ?? null,
        isPrimary: data.is_primary ?? false,
      },
      this.db,
    );

    if (!phone) {
      return null;
    }

    return this.mapPhone(phone);
  }

  async deletePhone(
    userExternalId: string,
    friendExternalId: string,
    phoneExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, phoneExternalId }, 'Deleting phone');

    const result = await deletePhone.run(
      { userExternalId, friendExternalId, phoneExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Email Methods
  // ============================================================================

  async addEmail(
    userExternalId: string,
    friendExternalId: string,
    data: EmailInput,
  ): Promise<Email | null> {
    this.logger.debug({ friendExternalId }, 'Adding email');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryEmail.run({ userExternalId, friendExternalId }, this.db);
    }

    const [email] = await createEmail.run(
      {
        userExternalId,
        friendExternalId,
        emailAddress: data.email_address,
        emailType: data.email_type,
        label: data.label ?? null,
        isPrimary: data.is_primary ?? false,
      },
      this.db,
    );

    if (!email) {
      return null;
    }

    return this.mapEmail(email);
  }

  async updateEmail(
    userExternalId: string,
    friendExternalId: string,
    emailExternalId: string,
    data: EmailInput,
  ): Promise<Email | null> {
    this.logger.debug({ friendExternalId, emailExternalId }, 'Updating email');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryEmail.run({ userExternalId, friendExternalId }, this.db);
    }

    const [email] = await updateEmail.run(
      {
        userExternalId,
        friendExternalId,
        emailExternalId,
        emailAddress: data.email_address,
        emailType: data.email_type,
        label: data.label ?? null,
        isPrimary: data.is_primary ?? false,
      },
      this.db,
    );

    if (!email) {
      return null;
    }

    return this.mapEmail(email);
  }

  async deleteEmail(
    userExternalId: string,
    friendExternalId: string,
    emailExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, emailExternalId }, 'Deleting email');

    const result = await deleteEmail.run(
      { userExternalId, friendExternalId, emailExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Address Methods
  // ============================================================================

  async addAddress(
    userExternalId: string,
    friendExternalId: string,
    data: AddressInput,
  ): Promise<Address | null> {
    this.logger.debug({ friendExternalId }, 'Adding address');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryAddress.run({ userExternalId, friendExternalId }, this.db);
    }

    const [address] = await createAddress.run(
      {
        userExternalId,
        friendExternalId,
        streetLine1: data.street_line1 ?? null,
        streetLine2: data.street_line2 ?? null,
        city: data.city ?? null,
        stateProvince: data.state_province ?? null,
        postalCode: data.postal_code ?? null,
        country: data.country ?? null,
        addressType: data.address_type,
        label: data.label ?? null,
        isPrimary: data.is_primary ?? false,
      },
      this.db,
    );

    if (!address) {
      return null;
    }

    return this.mapAddress(address);
  }

  async updateAddress(
    userExternalId: string,
    friendExternalId: string,
    addressExternalId: string,
    data: AddressInput,
  ): Promise<Address | null> {
    this.logger.debug({ friendExternalId, addressExternalId }, 'Updating address');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryAddress.run({ userExternalId, friendExternalId }, this.db);
    }

    const [address] = await updateAddress.run(
      {
        userExternalId,
        friendExternalId,
        addressExternalId,
        streetLine1: data.street_line1 ?? null,
        streetLine2: data.street_line2 ?? null,
        city: data.city ?? null,
        stateProvince: data.state_province ?? null,
        postalCode: data.postal_code ?? null,
        country: data.country ?? null,
        addressType: data.address_type,
        label: data.label ?? null,
        isPrimary: data.is_primary ?? false,
      },
      this.db,
    );

    if (!address) {
      return null;
    }

    return this.mapAddress(address);
  }

  async deleteAddress(
    userExternalId: string,
    friendExternalId: string,
    addressExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, addressExternalId }, 'Deleting address');

    const result = await deleteAddress.run(
      { userExternalId, friendExternalId, addressExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // URL Methods
  // ============================================================================

  async addUrl(
    userExternalId: string,
    friendExternalId: string,
    data: UrlInput,
  ): Promise<Url | null> {
    this.logger.debug({ friendExternalId }, 'Adding URL');

    const [url] = await createUrl.run(
      {
        userExternalId,
        friendExternalId,
        url: data.url,
        urlType: data.url_type,
        label: data.label ?? null,
      },
      this.db,
    );

    if (!url) {
      return null;
    }

    return this.mapUrl(url);
  }

  async updateUrl(
    userExternalId: string,
    friendExternalId: string,
    urlExternalId: string,
    data: UrlInput,
  ): Promise<Url | null> {
    this.logger.debug({ friendExternalId, urlExternalId }, 'Updating URL');

    const [url] = await updateUrl.run(
      {
        userExternalId,
        friendExternalId,
        urlExternalId,
        url: data.url,
        urlType: data.url_type,
        label: data.label ?? null,
      },
      this.db,
    );

    if (!url) {
      return null;
    }

    return this.mapUrl(url);
  }

  async deleteUrl(
    userExternalId: string,
    friendExternalId: string,
    urlExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, urlExternalId }, 'Deleting URL');

    const result = await deleteUrl.run(
      { userExternalId, friendExternalId, urlExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Photo Methods
  // ============================================================================

  async updatePhoto(
    userExternalId: string,
    friendExternalId: string,
    photoUrl: string | null,
    photoThumbnailUrl: string | null,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId }, 'Updating photo');

    const result = await updateFriendPhoto.run(
      {
        userExternalId,
        friendExternalId,
        photoUrl,
        photoThumbnailUrl,
      },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Favorites & Archive Methods (Epic 4)
  // ============================================================================

  /**
   * Toggle the favorite status of a friend
   * Returns the new is_favorite value
   */
  async toggleFavorite(userExternalId: string, friendExternalId: string): Promise<boolean | null> {
    this.logger.debug({ friendExternalId }, 'Toggling favorite status');

    const [result] = await toggleFavorite.run({ userExternalId, friendExternalId }, this.db);

    if (!result) {
      return null;
    }

    this.logger.info(
      { friendExternalId, isFavorite: result.is_favorite },
      'Favorite status toggled',
    );

    return result.is_favorite;
  }

  /**
   * Archive a friend with an optional reason
   */
  async archiveFriend(
    userExternalId: string,
    friendExternalId: string,
    reason?: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, reason }, 'Archiving friend');

    const [result] = await archiveFriend.run(
      {
        userExternalId,
        friendExternalId,
        archiveReason: reason ?? null,
      },
      this.db,
    );

    if (!result) {
      // Friend not found or already archived
      return false;
    }

    this.logger.info({ friendExternalId }, 'Friend archived');

    return true;
  }

  /**
   * Unarchive a friend (restore from archive)
   */
  async unarchiveFriend(userExternalId: string, friendExternalId: string): Promise<boolean> {
    this.logger.debug({ friendExternalId }, 'Unarchiving friend');

    const [result] = await unarchiveFriend.run({ userExternalId, friendExternalId }, this.db);

    if (!result) {
      // Friend not found or not archived
      return false;
    }

    this.logger.info({ friendExternalId }, 'Friend unarchived');

    return true;
  }

  // ============================================================================
  // Date Methods (Epic 1B)
  // ============================================================================

  async addDate(
    userExternalId: string,
    friendExternalId: string,
    data: DateInput,
  ): Promise<FriendDate | null> {
    this.logger.debug({ friendExternalId }, 'Adding date');

    // Check birthday limit (only one birthday allowed per friend)
    if (data.date_type === 'birthday') {
      const [countResult] = await countBirthdaysForFriend.run(
        { userExternalId, friendExternalId },
        this.db,
      );
      if (countResult && (countResult.count ?? 0) > 0) {
        throw new BirthdayAlreadyExistsError();
      }
    }

    const [date] = await createDate.run(
      {
        userExternalId,
        friendExternalId,
        dateValue: data.date_value,
        yearKnown: data.year_known ?? true,
        dateType: data.date_type,
        label: data.label ?? null,
      },
      this.db,
    );

    if (!date) {
      return null;
    }

    return this.mapDate(date);
  }

  async updateDate(
    userExternalId: string,
    friendExternalId: string,
    dateExternalId: string,
    data: DateInput,
  ): Promise<FriendDate | null> {
    this.logger.debug({ friendExternalId, dateExternalId }, 'Updating date');

    const [date] = await updateDate.run(
      {
        userExternalId,
        friendExternalId,
        dateExternalId,
        dateValue: data.date_value,
        yearKnown: data.year_known ?? true,
        dateType: data.date_type,
        label: data.label ?? null,
      },
      this.db,
    );

    if (!date) {
      return null;
    }

    return this.mapDate(date);
  }

  async deleteDate(
    userExternalId: string,
    friendExternalId: string,
    dateExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, dateExternalId }, 'Deleting date');

    const result = await deleteDate.run(
      { userExternalId, friendExternalId, dateExternalId },
      this.db,
    );

    return result.length > 0;
  }

  async getUpcomingDates(
    userExternalId: string,
    options: { days?: number; limit?: number } = {},
  ): Promise<UpcomingDate[]> {
    const { days = 30, limit = 10 } = options;
    this.logger.debug({ days, limit }, 'Getting upcoming dates');

    const results = await getUpcomingDates.run(
      {
        userExternalId,
        maxDays: days,
        limitCount: limit,
      },
      this.db,
    );

    return results.map((row) => this.mapUpcomingDate(row));
  }

  // ============================================================================
  // Met Info Methods (Epic 1B)
  // ============================================================================

  async setMetInfo(
    userExternalId: string,
    friendExternalId: string,
    data: MetInfoInput,
  ): Promise<MetInfo | null> {
    this.logger.debug({ friendExternalId }, 'Setting met info');

    const [metInfo] = await upsertMetInfo.run(
      {
        userExternalId,
        friendExternalId,
        metDate: data.met_date ?? null,
        metLocation: data.met_location ?? null,
        metContext: data.met_context ?? null,
      },
      this.db,
    );

    if (!metInfo) {
      return null;
    }

    return this.mapMetInfo(metInfo);
  }

  async deleteMetInfo(userExternalId: string, friendExternalId: string): Promise<boolean> {
    this.logger.debug({ friendExternalId }, 'Deleting met info');

    const result = await deleteMetInfo.run({ userExternalId, friendExternalId }, this.db);

    return result.length > 0;
  }

  // ============================================================================
  // Social Profile Methods (Epic 1B)
  // ============================================================================

  async addSocialProfile(
    userExternalId: string,
    friendExternalId: string,
    data: SocialProfileInput,
  ): Promise<SocialProfile | null> {
    this.logger.debug({ friendExternalId }, 'Adding social profile');

    const [profile] = await createSocialProfile.run(
      {
        userExternalId,
        friendExternalId,
        platform: data.platform,
        profileUrl: data.profile_url ?? null,
        username: data.username ?? null,
      },
      this.db,
    );

    if (!profile) {
      return null;
    }

    return this.mapSocialProfile(profile);
  }

  async updateSocialProfile(
    userExternalId: string,
    friendExternalId: string,
    profileExternalId: string,
    data: SocialProfileInput,
  ): Promise<SocialProfile | null> {
    this.logger.debug({ friendExternalId, profileExternalId }, 'Updating social profile');

    const [profile] = await updateSocialProfile.run(
      {
        userExternalId,
        friendExternalId,
        profileExternalId,
        platform: data.platform,
        profileUrl: data.profile_url ?? null,
        username: data.username ?? null,
      },
      this.db,
    );

    if (!profile) {
      return null;
    }

    return this.mapSocialProfile(profile);
  }

  async deleteSocialProfile(
    userExternalId: string,
    friendExternalId: string,
    profileExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, profileExternalId }, 'Deleting social profile');

    const result = await deleteSocialProfile.run(
      { userExternalId, friendExternalId, profileExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Professional History Methods
  // ============================================================================

  async addProfessionalHistory(
    userExternalId: string,
    friendExternalId: string,
    data: ProfessionalHistoryInput,
  ): Promise<ProfessionalHistory | null> {
    this.logger.debug({ friendExternalId }, 'Adding professional history');

    // If setting as primary, clear existing primary first
    if (data.is_primary) {
      await clearPrimaryProfessionalHistory.run({ userExternalId, friendExternalId }, this.db);
    }

    const [history] = await createProfessionalHistory.run(
      {
        userExternalId,
        friendExternalId,
        jobTitle: data.job_title ?? null,
        organization: data.organization ?? null,
        department: data.department ?? null,
        notes: data.notes ?? null,
        fromMonth: data.from_month,
        fromYear: data.from_year,
        toMonth: data.to_month ?? null,
        toYear: data.to_year ?? null,
        isPrimary: data.is_primary ?? false,
      },
      this.db,
    );

    if (!history) {
      return null;
    }

    return this.mapProfessionalHistory(history);
  }

  async updateProfessionalHistory(
    userExternalId: string,
    friendExternalId: string,
    historyExternalId: string,
    data: ProfessionalHistoryInput,
  ): Promise<ProfessionalHistory | null> {
    this.logger.debug({ friendExternalId, historyExternalId }, 'Updating professional history');

    // If setting as primary, clear existing primary first
    if (data.is_primary) {
      await clearPrimaryProfessionalHistory.run({ userExternalId, friendExternalId }, this.db);
    }

    const [history] = await updateProfessionalHistory.run(
      {
        userExternalId,
        friendExternalId,
        historyExternalId,
        jobTitle: data.job_title ?? null,
        organization: data.organization ?? null,
        department: data.department ?? null,
        notes: data.notes ?? null,
        fromMonth: data.from_month,
        fromYear: data.from_year,
        toMonth: data.to_month ?? null,
        toYear: data.to_year ?? null,
        isPrimary: data.is_primary ?? false,
      },
      this.db,
    );

    if (!history) {
      return null;
    }

    return this.mapProfessionalHistory(history);
  }

  async deleteProfessionalHistory(
    userExternalId: string,
    friendExternalId: string,
    historyExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, historyExternalId }, 'Deleting professional history');

    const result = await deleteProfessionalHistory.run(
      { userExternalId, friendExternalId, historyExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Relationship Methods (Epic 1D)
  // ============================================================================

  /**
   * Get all relationship types grouped by category
   */
  async getRelationshipTypes(): Promise<RelationshipTypesGrouped> {
    this.logger.debug('Getting relationship types');

    const types = await getAllRelationshipTypes.run(undefined, this.db);

    const grouped: RelationshipTypesGrouped = {
      family: [],
      professional: [],
      social: [],
    };

    for (const t of types) {
      const relationshipType: RelationshipType = {
        id: t.id as RelationshipTypeId,
        category: t.category as RelationshipCategory,
        label: t.label,
        inverseTypeId: (t.inverse_type_id ?? t.id) as RelationshipTypeId,
      };

      if (t.category === 'family') {
        grouped.family.push(relationshipType);
      } else if (t.category === 'professional') {
        grouped.professional.push(relationshipType);
      } else if (t.category === 'social') {
        grouped.social.push(relationshipType);
      }
    }

    return grouped;
  }

  /**
   * Add a relationship between two friends (creates inverse automatically)
   */
  async addRelationship(
    userExternalId: string,
    friendExternalId: string,
    data: RelationshipInput,
  ): Promise<Relationship | null> {
    this.logger.debug(
      { friendExternalId, relatedFriendExternalId: data.related_friend_id },
      'Adding relationship',
    );

    // Create the primary relationship
    const [relationship] = await createRelationship.run(
      {
        userExternalId,
        friendExternalId,
        relatedFriendExternalId: data.related_friend_id,
        relationshipTypeId: data.relationship_type_id,
        notes: data.notes ?? null,
      },
      this.db,
    );

    if (!relationship) {
      return null;
    }

    // Create the inverse relationship (if inverse type exists)
    await createInverseRelationship.run(
      {
        userExternalId,
        friendExternalId,
        relatedFriendExternalId: data.related_friend_id,
        relationshipTypeId: data.relationship_type_id,
        notes: data.notes ?? null,
      },
      this.db,
    );

    // Fetch the full relationship with related friend info
    const [fullRelationship] = await getRelationshipById.run(
      {
        userExternalId,
        friendExternalId,
        relationshipExternalId: relationship.external_id,
      },
      this.db,
    );

    if (!fullRelationship) {
      return null;
    }

    this.logger.info(
      {
        friendExternalId,
        relatedFriendExternalId: data.related_friend_id,
        relationshipType: data.relationship_type_id,
      },
      'Relationship created successfully',
    );

    return this.mapRelationship(fullRelationship);
  }

  /**
   * Update a relationship's notes
   */
  async updateRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
    data: RelationshipUpdateInput,
  ): Promise<Relationship | null> {
    this.logger.debug({ friendExternalId, relationshipExternalId }, 'Updating relationship');

    const [updated] = await updateRelationship.run(
      {
        userExternalId,
        friendExternalId,
        relationshipExternalId,
        notes: data.notes ?? null,
      },
      this.db,
    );

    if (!updated) {
      return null;
    }

    // Fetch the full relationship with related friend info
    const [fullRelationship] = await getRelationshipById.run(
      {
        userExternalId,
        friendExternalId,
        relationshipExternalId,
      },
      this.db,
    );

    if (!fullRelationship) {
      return null;
    }

    this.logger.info({ friendExternalId, relationshipExternalId }, 'Relationship updated');

    return this.mapRelationship(fullRelationship);
  }

  /**
   * Delete a relationship (and its inverse)
   */
  async deleteRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, relationshipExternalId }, 'Deleting relationship');

    // Delete the primary relationship and get related friend ID
    const [deleted] = await deleteRelationship.run(
      { userExternalId, friendExternalId, relationshipExternalId },
      this.db,
    );

    if (!deleted) {
      return false;
    }

    // Delete the inverse relationship
    await deleteInverseRelationship.run(
      {
        userExternalId,
        friendExternalId,
        relatedFriendId: deleted.related_friend_id,
        relationshipTypeId: deleted.relationship_type_id,
      },
      this.db,
    );

    this.logger.info({ friendExternalId, relationshipExternalId }, 'Relationship deleted');

    return true;
  }

  /**
   * Search friends by name (for autocomplete)
   */
  async searchFriends(
    userExternalId: string,
    query: string,
    excludeFriendExternalId?: string,
    limit = 10,
  ): Promise<FriendSearchResult[]> {
    this.logger.debug({ query, excludeFriendExternalId }, 'Searching friends');

    const searchPattern = createWildcardQuery(query);

    const results = await searchFriends.run(
      {
        userExternalId,
        searchPattern,
        excludeFriendExternalId: excludeFriendExternalId ?? null,
        limit,
      },
      this.db,
    );

    return results.map((r) => ({
      id: r.external_id,
      displayName: r.display_name,
      photoThumbnailUrl: r.photo_thumbnail_url ?? undefined,
    }));
  }

  // ============================================================================
  // Full-Text Search Methods (Epic 10)
  // ============================================================================

  /**
   * Full-text search across friends with relevance ranking
   * Searches: names, organization, job title, work notes, emails, phones,
   * relationship notes, and met context
   */
  async fullTextSearch(
    userExternalId: string,
    query: string,
    limit = 10,
  ): Promise<GlobalSearchResult[]> {
    this.logger.debug({ query, limit }, 'Full-text searching friends');

    const results = await fullTextSearchFriends.run(
      {
        userExternalId,
        query,
        wildcardQuery: createWildcardQuery(query),
        limit,
      },
      this.db,
    );

    return results.map((r) => this.mapGlobalSearchResult(r));
  }

  /**
   * Paginated full-text search with sorting options
   * Used by in-page search for friends list
   */
  async paginatedSearch(
    userExternalId: string,
    options: SearchOptions,
  ): Promise<PaginatedSearchResponse> {
    const { query, page, pageSize, sortBy, sortOrder } = options;
    const offset = (page - 1) * pageSize;

    this.logger.debug({ query, page, pageSize, sortBy, sortOrder }, 'Paginated search');

    const results = await paginatedFullTextSearch.run(
      {
        userExternalId,
        query,
        wildcardQuery: createWildcardQuery(query),
        sortBy,
        sortOrder,
        pageSize,
        offset,
      },
      this.db,
    );

    const total = results[0]?.total_count ?? 0;

    return {
      results: results.map((r) => this.mapPaginatedSearchResult(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Faceted full-text search with filter support and optional facet aggregation
   * Supports filtering by location, professional, and relationship facets
   */
  async facetedSearch(
    userExternalId: string,
    options: FacetedSearchOptions,
  ): Promise<FacetedSearchResponse> {
    const { query, page, pageSize, sortBy, sortOrder, filters, includeFacets } = options;

    // This method requires a query - use filterOnlyList for filter-only searches
    if (!query) {
      throw new Error(
        'facetedSearch requires a query - use filterOnlyList for filter-only searches',
      );
    }

    const offset = (page - 1) * pageSize;
    const wildcardQuery = createWildcardQuery(query);

    this.logger.debug(
      { query, page, pageSize, sortBy, sortOrder, filters, includeFacets },
      'Faceted search',
    );

    // Execute main search with filters
    const results = await facetedSearch.run(
      {
        userExternalId,
        query,
        wildcardQuery,
        sortBy,
        sortOrder,
        pageSize,
        offset,
        filterCountry: filters.country ?? null,
        filterCity: filters.city ?? null,
        filterOrganization: filters.organization ?? null,
        filterJobTitle: filters.job_title ?? null,
        filterDepartment: filters.department ?? null,
        filterRelationshipCategory: filters.relationship_category ?? null,
        filterCircles: filters.circles ?? null,
      },
      this.db,
    );

    const total = results[0]?.total_count ?? 0;

    const response: FacetedSearchResponse = {
      results: results.map((r) => this.mapFacetedSearchResult(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    // Fetch facet counts if requested
    if (includeFacets) {
      const [facetRows, circleRows] = await Promise.all([
        getFacetCounts.run({ userExternalId, query, wildcardQuery }, this.db),
        getCircleFacetCounts.run({ userExternalId }, this.db),
      ]);
      response.facets = this.aggregateFacets(facetRows, circleRows);
    }

    return response;
  }

  /**
   * Filter-only list with optional facet aggregation
   * Used when no search query is provided but filters may be applied
   */
  async filterOnlyList(
    userExternalId: string,
    options: FacetedSearchOptions,
  ): Promise<FacetedSearchResponse> {
    const { page, pageSize, sortBy, sortOrder, filters, includeFacets } = options;
    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { page, pageSize, sortBy, sortOrder, filters, includeFacets },
      'Filter-only list',
    );

    // Execute filter-only query
    const results = await filterOnlyList.run(
      {
        userExternalId,
        sortBy,
        sortOrder,
        pageSize,
        offset,
        filterCountry: filters.country ?? null,
        filterCity: filters.city ?? null,
        filterOrganization: filters.organization ?? null,
        filterJobTitle: filters.job_title ?? null,
        filterDepartment: filters.department ?? null,
        filterRelationshipCategory: filters.relationship_category ?? null,
        filterCircles: filters.circles ?? null,
      },
      this.db,
    );

    const total = results[0]?.total_count ?? 0;

    const response: FacetedSearchResponse = {
      results: results.map((r) => this.mapFilterOnlyResult(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    // Fetch facet counts if requested (uses all friends, not search-filtered)
    if (includeFacets) {
      const [facetRows, circleRows] = await Promise.all([
        getAllFacetCounts.run({ userExternalId }, this.db),
        getCircleFacetCounts.run({ userExternalId }, this.db),
      ]);
      response.facets = this.aggregateFacets(facetRows, circleRows);
    }

    return response;
  }

  /**
   * Get user's recent search queries
   */
  async getRecentSearches(userExternalId: string, limit = 10): Promise<string[]> {
    this.logger.debug({ limit }, 'Getting recent searches');

    const results = await getRecentSearches.run({ userExternalId, limit }, this.db);

    return results.map((r) => r.query);
  }

  /**
   * Add or update a recent search query
   * If the query already exists, updates the searched_at timestamp
   */
  async addRecentSearch(userExternalId: string, query: string): Promise<void> {
    this.logger.debug({ query }, 'Adding recent search');

    await addRecentSearch.run({ userExternalId, query }, this.db);
  }

  /**
   * Delete a specific recent search query
   */
  async deleteRecentSearch(userExternalId: string, query: string): Promise<boolean> {
    this.logger.debug({ query }, 'Deleting recent search');

    const result = await deleteRecentSearch.run({ userExternalId, query }, this.db);

    return result.length > 0;
  }

  /**
   * Clear all recent searches for a user
   */
  async clearRecentSearches(userExternalId: string): Promise<void> {
    this.logger.debug('Clearing all recent searches');

    await clearRecentSearches.run({ userExternalId }, this.db);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mapGlobalSearchResult(row: IFullTextSearchFriendsResult): GlobalSearchResult {
    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      rank: row.rank ?? 0,
      // Sanitize headline to prevent XSS - only allow <mark> tags from ts_headline
      headline: sanitizeSearchHeadline(row.headline),
      matchSource: (row.match_source as GlobalSearchResult['matchSource']) ?? null,
      circles: [], // Circles not included in this query
    };
  }

  private mapPaginatedSearchResult(row: IPaginatedFullTextSearchResult): GlobalSearchResult {
    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      rank: row.rank ?? 0,
      // Sanitize headline to prevent XSS - only allow <mark> tags from ts_headline
      headline: sanitizeSearchHeadline(row.headline),
      matchSource: (row.match_source as GlobalSearchResult['matchSource']) ?? null,
      circles: [], // Circles not included in this query
    };
  }

  private mapFacetedSearchResult(row: IFacetedSearchResult): GlobalSearchResult {
    // Parse circles from JSON
    const circlesRaw = (row.circles || []) as Array<{
      external_id: string;
      name: string;
      color: string | null;
    }>;

    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      rank: row.rank ?? 0,
      // Sanitize headline to prevent XSS - only allow <mark> tags from ts_headline
      headline: sanitizeSearchHeadline(row.headline),
      matchSource: (row.match_source as GlobalSearchResult['matchSource']) ?? null,
      circles: circlesRaw.map((c) => ({
        id: c.external_id,
        name: c.name,
        color: c.color,
      })),
    };
  }

  private mapFilterOnlyResult(row: IFilterOnlyListResult): GlobalSearchResult {
    // Parse circles from JSON
    const circlesRaw = (row.circles || []) as Array<{
      external_id: string;
      name: string;
      color: string | null;
    }>;

    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      rank: 0, // No ranking for filter-only results
      headline: null, // No headline for filter-only results
      matchSource: null, // No match source for filter-only results
      circles: circlesRaw.map((c) => ({
        id: c.external_id,
        name: c.name,
        color: c.color,
      })),
    };
  }

  /**
   * Aggregate raw facet count rows into grouped facet structure
   */
  private aggregateFacets(
    rows: IGetFacetCountsResult[],
    circleRows: IGetCircleFacetCountsResult[] = [],
  ): FacetGroups {
    const facets: FacetGroups = {
      location: [],
      professional: [],
      relationship: [],
      circles: [],
    };

    // Group rows by facet_field
    const groupedByField = new Map<string, FacetValue[]>();

    for (const row of rows) {
      if (!row.facet_field || !row.facet_value || row.count === null) continue;

      const existing = groupedByField.get(row.facet_field);
      if (existing) {
        existing.push({ value: row.facet_value, count: row.count });
      } else {
        groupedByField.set(row.facet_field, [{ value: row.facet_value, count: row.count }]);
      }
    }

    // Map field labels
    const fieldLabels: Record<string, string> = {
      country: 'Country',
      city: 'City',
      organization: 'Organization',
      job_title: 'Job Title',
      department: 'Department',
      relationship_category: 'Relationship',
    };

    // Build location facets
    for (const field of ['country', 'city'] as const) {
      const values = groupedByField.get(field);
      if (values) {
        facets.location.push({ field, label: fieldLabels[field], values });
      }
    }

    // Build professional facets
    for (const field of ['organization', 'job_title', 'department'] as const) {
      const values = groupedByField.get(field);
      if (values) {
        facets.professional.push({ field, label: fieldLabels[field], values });
      }
    }

    // Build relationship facets
    const relationshipValues = groupedByField.get('relationship_category');
    if (relationshipValues) {
      facets.relationship.push({
        field: 'relationship_category',
        label: fieldLabels.relationship_category,
        values: relationshipValues,
      });
    }

    // Build circle facets
    facets.circles = circleRows
      .filter((row) => row.value && row.count !== null)
      .map((row) => ({
        value: row.value,
        label: row.label,
        color: row.color ?? '#6B7280',
        count: row.count ?? 0,
      }));

    return facets;
  }

  private async createPhones(
    userExternalId: string,
    friendExternalId: string,
    phones: PhoneInput[],
  ): Promise<Phone[]> {
    const results: Phone[] = [];

    for (const phone of phones) {
      const created = await this.addPhone(userExternalId, friendExternalId, phone);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createEmails(
    userExternalId: string,
    friendExternalId: string,
    emails: EmailInput[],
  ): Promise<Email[]> {
    const results: Email[] = [];

    for (const email of emails) {
      const created = await this.addEmail(userExternalId, friendExternalId, email);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createAddresses(
    userExternalId: string,
    friendExternalId: string,
    addresses: AddressInput[],
  ): Promise<Address[]> {
    const results: Address[] = [];

    for (const address of addresses) {
      const created = await this.addAddress(userExternalId, friendExternalId, address);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createUrls(
    userExternalId: string,
    friendExternalId: string,
    urls: UrlInput[],
  ): Promise<Url[]> {
    const results: Url[] = [];

    for (const url of urls) {
      const created = await this.addUrl(userExternalId, friendExternalId, url);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createDates(
    userExternalId: string,
    friendExternalId: string,
    dates: DateInput[],
  ): Promise<FriendDate[]> {
    const results: FriendDate[] = [];

    for (const date of dates) {
      const created = await this.addDate(userExternalId, friendExternalId, date);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createSocialProfiles(
    userExternalId: string,
    friendExternalId: string,
    profiles: SocialProfileInput[],
  ): Promise<SocialProfile[]> {
    const results: SocialProfile[] = [];

    for (const profile of profiles) {
      const created = await this.addSocialProfile(userExternalId, friendExternalId, profile);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createProfessionalHistories(
    userExternalId: string,
    friendExternalId: string,
    histories: ProfessionalHistoryInput[],
  ): Promise<ProfessionalHistory[]> {
    const results: ProfessionalHistory[] = [];

    for (const history of histories) {
      const created = await this.addProfessionalHistory(userExternalId, friendExternalId, history);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private mapProfessionalHistory(
    row: IGetProfessionalHistoryByFriendIdResult,
  ): ProfessionalHistory {
    return {
      id: row.external_id,
      jobTitle: row.job_title ?? undefined,
      organization: row.organization ?? undefined,
      department: row.department ?? undefined,
      notes: row.notes ?? undefined,
      fromMonth: row.from_month,
      fromYear: row.from_year,
      toMonth: row.to_month ?? undefined,
      toYear: row.to_year ?? undefined,
      isPrimary: row.is_primary,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapFriendListItem(row: IGetFriendsByUserIdResult): FriendListItem {
    // Epic 4: Parse circles from JSON
    const circlesRaw = (row.circles || []) as Array<{
      external_id: string;
      name: string;
      color: string | null;
    }>;

    // Format birthday date if present
    const birthday =
      row.birthday instanceof Date
        ? row.birthday.toISOString().split('T')[0]
        : (row.birthday ?? undefined);

    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      // Extended fields for dynamic columns
      nickname: row.nickname ?? undefined,
      maidenName: row.maiden_name ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      department: row.department ?? undefined,
      primaryCity: row.primary_city ?? undefined,
      primaryCountry: row.primary_country ?? undefined,
      birthday,
      // Epic 4: Organization fields
      isFavorite: row.is_favorite,
      archivedAt: row.archived_at?.toISOString() ?? undefined,
      circles: circlesRaw.map((c) => ({
        id: c.external_id,
        name: c.name,
        color: c.color,
      })),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapPhone(row: IGetPhonesByFriendIdResult): Phone {
    return {
      id: row.external_id,
      phoneNumber: row.phone_number,
      phoneType: row.phone_type as PhoneType,
      label: row.label ?? undefined,
      isPrimary: row.is_primary,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapEmail(row: IGetEmailsByFriendIdResult): Email {
    return {
      id: row.external_id,
      emailAddress: row.email_address,
      emailType: row.email_type as EmailType,
      label: row.label ?? undefined,
      isPrimary: row.is_primary,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapAddress(row: IGetAddressesByFriendIdResult): Address {
    return {
      id: row.external_id,
      streetLine1: row.street_line1 ?? undefined,
      streetLine2: row.street_line2 ?? undefined,
      city: row.city ?? undefined,
      stateProvince: row.state_province ?? undefined,
      postalCode: row.postal_code ?? undefined,
      country: row.country ?? undefined,
      addressType: row.address_type as AddressType,
      label: row.label ?? undefined,
      isPrimary: row.is_primary,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapUrl(row: IGetUrlsByFriendIdResult): Url {
    return {
      id: row.external_id,
      url: row.url,
      urlType: row.url_type as UrlType,
      label: row.label ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapDate(row: IGetDatesByFriendIdResult): FriendDate {
    // date_value comes as a Date object from PostgreSQL
    const dateValue =
      row.date_value instanceof Date ? row.date_value.toISOString().split('T')[0] : row.date_value;
    return {
      id: row.external_id,
      dateValue,
      yearKnown: row.year_known,
      dateType: row.date_type as DateType,
      label: row.label ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapUpcomingDate(row: IGetUpcomingDatesResult): UpcomingDate {
    // date_value comes as a Date object from PostgreSQL
    const dateValue =
      row.date_value instanceof Date ? row.date_value.toISOString().split('T')[0] : row.date_value;
    return {
      id: row.date_external_id,
      dateValue,
      yearKnown: row.year_known,
      dateType: row.date_type as DateType,
      label: row.label ?? undefined,
      daysUntil: row.days_until ?? 0,
      friend: {
        id: row.friend_external_id,
        displayName: row.friend_display_name,
        photoThumbnailUrl: row.friend_photo_thumbnail_url ?? undefined,
      },
    };
  }

  private mapMetInfo(row: IGetMetInfoByFriendIdResult): MetInfo {
    // met_date comes as a Date object from PostgreSQL
    const metDate =
      row.met_date instanceof Date
        ? row.met_date.toISOString().split('T')[0]
        : (row.met_date ?? undefined);
    return {
      id: row.external_id,
      metDate,
      metLocation: row.met_location ?? undefined,
      metContext: row.met_context ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapSocialProfile(row: IGetSocialProfilesByFriendIdResult): SocialProfile {
    return {
      id: row.external_id,
      platform: row.platform as SocialPlatform,
      profileUrl: row.profile_url ?? undefined,
      username: row.username ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapRelationship(row: IGetRelationshipsByFriendIdResult): Relationship {
    return {
      id: row.external_id,
      relatedFriendId: row.related_friend_external_id,
      relatedFriendDisplayName: row.related_friend_display_name,
      relatedFriendPhotoThumbnailUrl: row.related_friend_photo_thumbnail_url ?? undefined,
      relationshipTypeId: row.relationship_type_id as RelationshipTypeId,
      relationshipTypeLabel: row.relationship_type_label,
      relationshipCategory: row.relationship_category as RelationshipCategory,
      notes: row.notes ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Maps a friend row with embedded JSON arrays for related data
   * Used by the optimized getFriendById query
   */
  private mapFriendWithEmbeddedRelations(friend: IGetFriendByIdResult): Friend {
    // Parse JSON arrays (PostgreSQL returns them as parsed objects when using node-pg)
    const phones = (friend.phones || []) as Array<{
      external_id: string;
      phone_number: string;
      phone_type: string;
      label: string | null;
      is_primary: boolean;
      created_at: string;
    }>;

    const emails = (friend.emails || []) as Array<{
      external_id: string;
      email_address: string;
      email_type: string;
      label: string | null;
      is_primary: boolean;
      created_at: string;
    }>;

    const addresses = (friend.addresses || []) as Array<{
      external_id: string;
      street_line1: string | null;
      street_line2: string | null;
      city: string | null;
      state_province: string | null;
      postal_code: string | null;
      country: string | null;
      address_type: string;
      label: string | null;
      is_primary: boolean;
      created_at: string;
    }>;

    const urls = (friend.urls || []) as Array<{
      external_id: string;
      url: string;
      url_type: string;
      label: string | null;
      created_at: string;
    }>;

    // Epic 1B: Parse new sub-resources
    const dates = (friend.dates || []) as Array<{
      external_id: string;
      date_value: string;
      year_known: boolean;
      date_type: string;
      label: string | null;
      created_at: string;
    }>;

    const metInfoRaw = friend.met_info as {
      external_id: string;
      met_date: string | null;
      met_location: string | null;
      met_context: string | null;
      created_at: string;
      updated_at: string;
    } | null;

    const socialProfiles = (friend.social_profiles || []) as Array<{
      external_id: string;
      platform: string;
      profile_url: string | null;
      username: string | null;
      created_at: string;
    }>;

    // Epic 1D: Relationships
    const relationships = (friend.relationships || []) as Array<{
      external_id: string;
      related_friend_external_id: string;
      related_friend_display_name: string;
      related_friend_photo_thumbnail_url: string | null;
      relationship_type_id: string;
      relationship_type_label: string;
      relationship_category: string;
      notes: string | null;
      created_at: string;
    }>;

    // Epic 4: Circles
    const circles = (friend.circles || []) as Array<{
      external_id: string;
      name: string;
      color: string | null;
    }>;

    // Professional history
    const professionalHistory = (friend.professional_history || []) as Array<{
      external_id: string;
      job_title: string | null;
      organization: string | null;
      department: string | null;
      notes: string | null;
      from_month: number;
      from_year: number;
      to_month: number | null;
      to_year: number | null;
      is_primary: boolean;
      created_at: string;
    }>;

    return {
      id: friend.external_id,
      displayName: friend.display_name,
      nickname: friend.nickname ?? undefined,
      namePrefix: friend.name_prefix ?? undefined,
      nameFirst: friend.name_first ?? undefined,
      nameMiddle: friend.name_middle ?? undefined,
      nameLast: friend.name_last ?? undefined,
      nameSuffix: friend.name_suffix ?? undefined,
      maidenName: friend.maiden_name ?? undefined,
      photoUrl: friend.photo_url ?? undefined,
      photoThumbnailUrl: friend.photo_thumbnail_url ?? undefined,
      interests: friend.interests ?? undefined,
      professionalHistory: professionalHistory.map((ph) => ({
        id: ph.external_id,
        jobTitle: ph.job_title ?? undefined,
        organization: ph.organization ?? undefined,
        department: ph.department ?? undefined,
        notes: ph.notes ?? undefined,
        fromMonth: ph.from_month,
        fromYear: ph.from_year,
        toMonth: ph.to_month,
        toYear: ph.to_year,
        isPrimary: ph.is_primary,
        createdAt: ph.created_at,
      })),
      phones: phones.map((p) => ({
        id: p.external_id,
        phoneNumber: p.phone_number,
        phoneType: p.phone_type as Phone['phoneType'],
        label: p.label ?? undefined,
        isPrimary: p.is_primary,
        createdAt: p.created_at,
      })),
      emails: emails.map((e) => ({
        id: e.external_id,
        emailAddress: e.email_address,
        emailType: e.email_type as Email['emailType'],
        label: e.label ?? undefined,
        isPrimary: e.is_primary,
        createdAt: e.created_at,
      })),
      addresses: addresses.map((a) => ({
        id: a.external_id,
        streetLine1: a.street_line1 ?? undefined,
        streetLine2: a.street_line2 ?? undefined,
        city: a.city ?? undefined,
        stateProvince: a.state_province ?? undefined,
        postalCode: a.postal_code ?? undefined,
        country: a.country ?? undefined,
        addressType: a.address_type as Address['addressType'],
        label: a.label ?? undefined,
        isPrimary: a.is_primary,
        createdAt: a.created_at,
      })),
      urls: urls.map((u) => ({
        id: u.external_id,
        url: u.url,
        urlType: u.url_type as Url['urlType'],
        label: u.label ?? undefined,
        createdAt: u.created_at,
      })),
      // Epic 1B: New sub-resources
      dates: dates.map((d) => ({
        id: d.external_id,
        dateValue: d.date_value,
        yearKnown: d.year_known,
        dateType: d.date_type as DateType,
        label: d.label ?? undefined,
        createdAt: d.created_at,
      })),
      metInfo: metInfoRaw
        ? {
            id: metInfoRaw.external_id,
            metDate: metInfoRaw.met_date ?? undefined,
            metLocation: metInfoRaw.met_location ?? undefined,
            metContext: metInfoRaw.met_context ?? undefined,
            createdAt: metInfoRaw.created_at,
            updatedAt: metInfoRaw.updated_at,
          }
        : undefined,
      socialProfiles: socialProfiles.map((sp) => ({
        id: sp.external_id,
        platform: sp.platform as SocialPlatform,
        profileUrl: sp.profile_url ?? undefined,
        username: sp.username ?? undefined,
        createdAt: sp.created_at,
      })),
      // Epic 1D: Relationships
      relationships: relationships.map((r) => ({
        id: r.external_id,
        relatedFriendId: r.related_friend_external_id,
        relatedFriendDisplayName: r.related_friend_display_name,
        relatedFriendPhotoThumbnailUrl: r.related_friend_photo_thumbnail_url ?? undefined,
        relationshipTypeId: r.relationship_type_id as RelationshipTypeId,
        relationshipTypeLabel: r.relationship_type_label,
        relationshipCategory: r.relationship_category as RelationshipCategory,
        notes: r.notes ?? undefined,
        createdAt: r.created_at,
      })),
      // Epic 4: Organization fields
      isFavorite: friend.is_favorite,
      archivedAt: friend.archived_at?.toISOString() ?? undefined,
      archiveReason: friend.archive_reason ?? undefined,
      circles: circles.map((c) => ({
        id: c.external_id,
        name: c.name,
        color: c.color,
      })),
      createdAt: friend.created_at.toISOString(),
      updatedAt: friend.updated_at.toISOString(),
    };
  }

  /**
   * Get network graph data for visualization
   * Returns all non-archived friends as nodes and their relationships as links
   */
  async getNetworkGraphData(userExternalId: string): Promise<NetworkGraphData> {
    this.logger.debug({ userExternalId }, 'Fetching network graph data');

    // Fetch nodes and links in parallel using PgTyped queries
    const [nodesResult, linksResult] = await Promise.all([
      getNetworkGraphNodes.run({ userExternalId }, this.db),
      getNetworkGraphLinks.run({ userExternalId }, this.db),
    ]);

    const nodes: NetworkGraphNode[] = nodesResult.map((row) => ({
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      isFavorite: row.is_favorite,
    }));

    // Create a set of valid node IDs for filtering links
    const nodeIds = new Set(nodes.map((n) => n.id));

    const links: NetworkGraphLink[] = linksResult
      .filter((row) => nodeIds.has(row.source_id) && nodeIds.has(row.target_id))
      .map((row) => ({
        source: row.source_id,
        target: row.target_id,
        relationshipType: row.relationship_type_id as RelationshipTypeId,
        relationshipCategory: row.relationship_category as RelationshipCategory,
        relationshipLabel: row.relationship_label,
      }));

    this.logger.debug(
      { nodeCount: nodes.length, linkCount: links.length },
      'Network graph data fetched',
    );

    return { nodes, links };
  }
}
