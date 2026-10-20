import type {
  FacetedSearchOptions,
  FacetedSearchResponse,
  FriendListItemResponse,
  FriendListOptions,
  FriendListResponse,
  FriendResponse,
  FriendSearchResultResponse,
  GlobalSearchResultResponse,
  MetInfoResponse,
  NetworkGraphResponse,
  PaginatedSearchResponse,
  RelationshipResponse,
  RelationshipTypesGroupedResponse,
  SearchOptions,
  UpcomingDateResponse,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { FriendCreationError } from '../../errors/friend-creation.error.js';
import { FriendNotFoundError } from '../../errors/friend-not-found.error.js';
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
} from '../../models/queries/friends.queries.js';
import { formatDateOnly } from '../../utils/date.js';
import { parseAddressesJson } from '../../utils/db-json/parse-addresses-json.js';
import { parseCirclesJson } from '../../utils/db-json/parse-circles-json.js';
import { parseDatesJson } from '../../utils/db-json/parse-dates-json.js';
import { parseEmailsJson } from '../../utils/db-json/parse-emails-json.js';
import { parseMetInfoJson } from '../../utils/db-json/parse-met-info-json.js';
import { parsePhonesJson } from '../../utils/db-json/parse-phones-json.js';
import { parseProfessionalHistoryJson } from '../../utils/db-json/parse-professional-history-json.js';
import { parseRelationshipsJson } from '../../utils/db-json/parse-relationships-json.js';
import { parseSocialProfilesJson } from '../../utils/db-json/parse-social-profiles-json.js';
import { parseUrlsJson } from '../../utils/db-json/parse-urls-json.js';
import { parseAddressType } from '../../utils/parse-address-type.js';
import { parseDateType } from '../../utils/parse-date-type.js';
import { parseEmailType } from '../../utils/parse-email-type.js';
import { parsePhoneType } from '../../utils/parse-phone-type.js';
import { parseRelationshipCategory } from '../../utils/parse-relationship-category.js';
import { parseRelationshipTypeId } from '../../utils/parse-relationship-type-id.js';
import { parseSocialPlatform } from '../../utils/parse-social-platform.js';
import { parseUrlType } from '../../utils/parse-url-type.js';
import type { PhotoService } from '../photo.service.js';
import type { NetworkGraphService } from './network-graph.service.js';
import type {
  RelationshipCreateData,
  RelationshipService,
  RelationshipUpdateData,
} from './relationship.service.js';
import type { SearchService } from './search.service.js';
import type { AddressData, AddressService } from './sub-resources/address.service.js';
import type { DateData, DateService } from './sub-resources/date.service.js';
import type { EmailData, EmailService } from './sub-resources/email.service.js';
import type { MetInfoData, MetInfoService } from './sub-resources/met-info.service.js';
import type { PhoneData, PhoneService } from './sub-resources/phone.service.js';
import type {
  ProfessionalHistoryData,
  ProfessionalHistoryService,
} from './sub-resources/professional-history.service.js';
import type {
  SocialProfileData,
  SocialProfileService,
} from './sub-resources/social-profile.service.js';
import type { UrlData, UrlService } from './sub-resources/url.service.js';

export interface FriendCreateData {
  displayName: string;
  nickname?: string;
  namePrefix?: string;
  nameFirst?: string;
  nameMiddle?: string;
  nameLast?: string;
  nameSuffix?: string;
  maidenName?: string;
  interests?: string;
  phones: PhoneData[];
  emails: EmailData[];
  addresses: AddressData[];
  urls: UrlData[];
  dates: DateData[];
  socialProfiles: SocialProfileData[];
  professionalHistory: ProfessionalHistoryData[];
  metInfo?: MetInfoData;
}

/** An absent key leaves the column untouched; `null` clears it. */
export interface FriendUpdateData {
  displayName?: string;
  nickname?: string | null;
  namePrefix?: string | null;
  nameFirst?: string | null;
  nameMiddle?: string | null;
  nameLast?: string | null;
  nameSuffix?: string | null;
  maidenName?: string | null;
  interests?: string | null;
}

export interface FriendsServiceOptions {
  db: pg.Pool;
  logger: Logger;
  photoService: PhotoService;
  searchService: SearchService;
  relationshipService: RelationshipService;
  networkGraphService: NetworkGraphService;
  phoneService: PhoneService;
  emailService: EmailService;
  addressService: AddressService;
  urlService: UrlService;
  dateService: DateService;
  socialProfileService: SocialProfileService;
  professionalHistoryService: ProfessionalHistoryService;
  metInfoService: MetInfoService;
}

/**
 * FriendsService is the main orchestrator for friend-related operations.
 * It delegates to specialized services for specific functionality.
 */
export class FriendsService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;
  private readonly photoService: PhotoService;
  private readonly searchService: SearchService;
  private readonly relationshipService: RelationshipService;
  private readonly networkGraphService: NetworkGraphService;
  private readonly phoneService: PhoneService;
  private readonly emailService: EmailService;
  private readonly addressService: AddressService;
  private readonly urlService: UrlService;
  private readonly dateService: DateService;
  private readonly socialProfileService: SocialProfileService;
  private readonly professionalHistoryService: ProfessionalHistoryService;
  private readonly metInfoService: MetInfoService;

  constructor(options: FriendsServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
    this.photoService = options.photoService;
    this.searchService = options.searchService;
    this.relationshipService = options.relationshipService;
    this.networkGraphService = options.networkGraphService;
    this.phoneService = options.phoneService;
    this.emailService = options.emailService;
    this.addressService = options.addressService;
    this.urlService = options.urlService;
    this.dateService = options.dateService;
    this.socialProfileService = options.socialProfileService;
    this.professionalHistoryService = options.professionalHistoryService;
    this.metInfoService = options.metInfoService;
  }

  // ============================================================================
  // Friend CRUD Operations
  // ============================================================================

  /**
   * List friends for a user with pagination and sorting
   */
  public async listFriends(
    userExternalId: string,
    options: FriendListOptions,
  ): Promise<FriendListResponse> {
    this.logger.debug({ userExternalId, options }, 'Listing friends');

    const offset = (options.page - 1) * options.pageSize;

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
        archivedFilter,
        favoritesOnly: options.isFavoritesOnly ?? false,
      },
      this.db,
    );

    const total = friends[0]?.total_count ?? 0;

    return {
      data: friends.map((c) => this.mapFriendListItem(c)),
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / options.pageSize),
      },
    };
  }

  /**
   * Get a single friend by ID with all related data
   */
  public async findFriend(userExternalId: string, friendExternalId: string) {
    this.logger.debug({ userExternalId, friendExternalId }, 'Getting friend');

    const [friend] = await getFriendById.run({ userExternalId, friendExternalId }, this.db);

    if (friend === undefined) {
      return undefined;
    }

    return this.mapFriendWithEmbeddedRelations(friend);
  }

  public async getFriend(userExternalId: string, friendExternalId: string) {
    const friend = await this.findFriend(userExternalId, friendExternalId);

    if (friend === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }

    return friend;
  }

  /**
   * Create a new friend with optional sub-resources
   */
  public async createFriend(
    userExternalId: string,
    data: FriendCreateData,
  ): Promise<FriendResponse> {
    this.logger.info({ userExternalId }, 'Creating friend');

    // The friend row and all its sub-resources must be created atomically:
    // a failure partway through previously left an orphaned friend while the
    // API returned 500. Run everything on one transactional client, sequentially
    // (a single connection serializes anyway, so Promise.all bought nothing).
    const client = await this.db.connect();
    let friend: Awaited<ReturnType<typeof createFriend.run>>[number];
    let phones: Awaited<ReturnType<PhoneService['createMany']>>;
    let emails: Awaited<ReturnType<EmailService['createMany']>>;
    let addresses: Awaited<ReturnType<AddressService['createMany']>>;
    let urls: Awaited<ReturnType<UrlService['createMany']>>;
    let dates: Awaited<ReturnType<DateService['createMany']>>;
    let socialProfiles: Awaited<ReturnType<SocialProfileService['createMany']>>;
    let professionalHistory: Awaited<ReturnType<ProfessionalHistoryService['createMany']>>;
    let metInfo: MetInfoResponse | undefined;

    try {
      await client.query('BEGIN');

      const [created] = await createFriend.run(
        {
          userExternalId,
          displayName: data.displayName,
          nickname: data.nickname ?? null,
          namePrefix: data.namePrefix ?? null,
          nameFirst: data.nameFirst ?? null,
          nameMiddle: data.nameMiddle ?? null,
          nameLast: data.nameLast ?? null,
          nameSuffix: data.nameSuffix ?? null,
          maidenName: data.maidenName ?? null,
          interests: data.interests ?? null,
        },
        client,
      );

      if (!created) {
        throw new FriendCreationError();
      }
      friend = created;
      const friendExternalId = friend.external_id;

      phones = await this.phoneService.createMany(
        userExternalId,
        friendExternalId,
        data.phones,
        client,
      );
      emails = await this.emailService.createMany(
        userExternalId,
        friendExternalId,
        data.emails,
        client,
      );
      addresses = await this.addressService.createMany(
        userExternalId,
        friendExternalId,
        data.addresses,
        client,
      );
      urls = await this.urlService.createMany(userExternalId, friendExternalId, data.urls, client);
      dates = await this.dateService.createMany(
        userExternalId,
        friendExternalId,
        data.dates,
        client,
      );
      socialProfiles = await this.socialProfileService.createMany(
        userExternalId,
        friendExternalId,
        data.socialProfiles,
        client,
      );
      professionalHistory = await this.professionalHistoryService.createMany(
        userExternalId,
        friendExternalId,
        data.professionalHistory,
        client,
      );

      if (data.metInfo !== undefined) {
        metInfo = await this.metInfoService.set(
          userExternalId,
          friendExternalId,
          data.metInfo,
          client,
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback failure to preserve the original error.
      }
      if (error instanceof FriendCreationError) {
        this.logger.error({ userExternalId }, 'Failed to create friend');
      }
      throw error;
    } finally {
      client.release();
    }

    this.logger.info({ friendExternalId: friend.external_id }, 'Friend created successfully');

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
      relationships: [],
      isFavorite: false,
      circles: [],
      createdAt: friend.created_at.toISOString(),
      updatedAt: friend.updated_at.toISOString(),
    };
  }

  /**
   * Update an existing friend
   */
  public async updateFriend(
    userExternalId: string,
    friendExternalId: string,
    data: FriendUpdateData,
  ): Promise<FriendResponse> {
    this.logger.info({ userExternalId, friendExternalId }, 'Updating friend');

    const [updated] = await updateFriend.run(
      {
        userExternalId,
        friendExternalId,
        displayName: data.displayName ?? null,
        updateNickname: 'nickname' in data,
        nickname: data.nickname ?? null,
        updateNamePrefix: 'namePrefix' in data,
        namePrefix: data.namePrefix ?? null,
        updateNameFirst: 'nameFirst' in data,
        nameFirst: data.nameFirst ?? null,
        updateNameMiddle: 'nameMiddle' in data,
        nameMiddle: data.nameMiddle ?? null,
        updateNameLast: 'nameLast' in data,
        nameLast: data.nameLast ?? null,
        updateNameSuffix: 'nameSuffix' in data,
        nameSuffix: data.nameSuffix ?? null,
        updateMaidenName: 'maidenName' in data,
        maidenName: data.maidenName ?? null,
        updateInterests: 'interests' in data,
        interests: data.interests ?? null,
      },
      this.db,
    );

    if (updated === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }

    this.logger.info({ friendExternalId }, 'Friend updated successfully');

    return this.getFriend(userExternalId, friendExternalId);
  }

  /**
   * Soft delete a friend
   */
  public async deleteFriend(userExternalId: string, friendExternalId: string): Promise<void> {
    this.logger.info({ userExternalId, friendExternalId }, 'Deleting friend');

    const result = await softDeleteFriend.run({ userExternalId, friendExternalId }, this.db);

    if (result.length === 0) {
      throw new FriendNotFoundError(friendExternalId);
    }

    // Remove photo files here rather than in the route, so every caller of
    // deleteFriend cleans them up. Best-effort: a missing file must not fail
    // the delete.
    try {
      await this.photoService.deletePhoto(friendExternalId);
    } catch (error) {
      this.logger.warn({ err: error, friendExternalId }, 'Failed to delete friend photos');
    }

    this.logger.info({ friendExternalId }, 'Friend deleted successfully');
  }

  // ============================================================================
  // Photo Methods
  // ============================================================================

  public async updatePhoto(
    userExternalId: string,
    friendExternalId: string,
    photoUrl: string | null,
    photoThumbnailUrl: string | null,
  ): Promise<void> {
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

    if (result.length === 0) {
      throw new FriendNotFoundError(friendExternalId);
    }
  }

  // ============================================================================
  // Favorites & Archive Methods
  // ============================================================================

  public async toggleFavorite(userExternalId: string, friendExternalId: string): Promise<boolean> {
    this.logger.debug({ friendExternalId }, 'Toggling favorite status');

    const [result] = await toggleFavorite.run({ userExternalId, friendExternalId }, this.db);

    if (result === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }

    this.logger.info(
      { friendExternalId, isFavorite: result.is_favorite },
      'Favorite status toggled',
    );

    return result.is_favorite;
  }

  public async archiveFriend(
    userExternalId: string,
    friendExternalId: string,
    reason?: string,
  ): Promise<void> {
    this.logger.debug({ friendExternalId, reason }, 'Archiving friend');

    const [result] = await archiveFriend.run(
      {
        userExternalId,
        friendExternalId,
        archiveReason: reason ?? null,
      },
      this.db,
    );

    if (result === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }

    this.logger.info({ friendExternalId }, 'Friend archived');
  }

  public async unarchiveFriend(userExternalId: string, friendExternalId: string): Promise<void> {
    this.logger.debug({ friendExternalId }, 'Unarchiving friend');

    const [result] = await unarchiveFriend.run({ userExternalId, friendExternalId }, this.db);

    if (result === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }

    this.logger.info({ friendExternalId }, 'Friend unarchived');
  }

  public async getUpcomingDates(
    userExternalId: string,
    options: { days?: number; limit?: number } = {},
  ): Promise<UpcomingDateResponse[]> {
    return this.dateService.getUpcomingDates(userExternalId, options);
  }

  // ============================================================================
  // Met Info Methods (delegated)
  // ============================================================================

  public async setMetInfo(userExternalId: string, friendExternalId: string, data: MetInfoData) {
    return this.metInfoService.set(userExternalId, friendExternalId, data);
  }

  public async deleteMetInfo(userExternalId: string, friendExternalId: string) {
    return this.metInfoService.delete(userExternalId, friendExternalId);
  }

  // ============================================================================
  // Relationship Methods (delegated)
  // ============================================================================

  public async getRelationshipTypes(): Promise<RelationshipTypesGroupedResponse> {
    return this.relationshipService.getRelationshipTypes();
  }

  public async addRelationship(
    userExternalId: string,
    friendExternalId: string,
    data: RelationshipCreateData,
  ): Promise<RelationshipResponse> {
    return this.relationshipService.addRelationship(userExternalId, friendExternalId, data);
  }

  public async updateRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
    data: RelationshipUpdateData,
  ): Promise<RelationshipResponse> {
    return this.relationshipService.updateRelationship(
      userExternalId,
      friendExternalId,
      relationshipExternalId,
      data,
    );
  }

  public async deleteRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
  ): Promise<void> {
    return this.relationshipService.deleteRelationship(
      userExternalId,
      friendExternalId,
      relationshipExternalId,
    );
  }

  public async searchFriends(
    userExternalId: string,
    query: string,
    excludeFriendExternalId?: string,
    limit = 10,
  ): Promise<FriendSearchResultResponse[]> {
    return this.relationshipService.searchFriends(
      userExternalId,
      query,
      excludeFriendExternalId,
      limit,
    );
  }

  // ============================================================================
  // Full-Text Search Methods (delegated)
  // ============================================================================

  public async fullTextSearch(
    userExternalId: string,
    query: string,
    limit = 10,
  ): Promise<GlobalSearchResultResponse[]> {
    return this.searchService.fullTextSearch(userExternalId, query, limit);
  }

  public async paginatedSearch(
    userExternalId: string,
    options: SearchOptions,
  ): Promise<PaginatedSearchResponse> {
    return this.searchService.paginatedSearch(userExternalId, options);
  }

  public async facetedSearch(
    userExternalId: string,
    options: FacetedSearchOptions,
  ): Promise<FacetedSearchResponse> {
    return this.searchService.facetedSearch(userExternalId, options);
  }

  public async filterOnlyList(
    userExternalId: string,
    options: FacetedSearchOptions,
  ): Promise<FacetedSearchResponse> {
    return this.searchService.filterOnlyList(userExternalId, options);
  }

  public async getRecentSearches(userExternalId: string, limit = 10): Promise<string[]> {
    return this.searchService.getRecentSearches(userExternalId, limit);
  }

  public async addRecentSearch(userExternalId: string, query: string): Promise<void> {
    return this.searchService.addRecentSearch(userExternalId, query);
  }

  public async deleteRecentSearch(userExternalId: string, query: string): Promise<void> {
    return this.searchService.deleteRecentSearch(userExternalId, query);
  }

  public async clearRecentSearches(userExternalId: string): Promise<void> {
    return this.searchService.clearRecentSearches(userExternalId);
  }

  // ============================================================================
  // Network Graph Methods (delegated)
  // ============================================================================

  public async getNetworkGraphData(userExternalId: string): Promise<NetworkGraphResponse> {
    return this.networkGraphService.getNetworkGraphData(userExternalId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mapFriendListItem(row: IGetFriendsByUserIdResult): FriendListItemResponse {
    const circlesRaw = parseCirclesJson(row.circles, this.logger);

    const birthday = formatDateOnly(row.birthday);

    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      nickname: row.nickname ?? undefined,
      maidenName: row.maiden_name ?? undefined,
      organization: row.organization ?? undefined,
      jobTitle: row.job_title ?? undefined,
      department: row.department ?? undefined,
      primaryCity: row.primary_city ?? undefined,
      primaryCountry: row.primary_country ?? undefined,
      birthday,
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

  private mapFriendWithEmbeddedRelations(friend: IGetFriendByIdResult): FriendResponse {
    const phones = parsePhonesJson(friend.phones, this.logger);
    const emails = parseEmailsJson(friend.emails, this.logger);
    const addresses = parseAddressesJson(friend.addresses, this.logger);
    const urls = parseUrlsJson(friend.urls, this.logger);
    const dates = parseDatesJson(friend.dates, this.logger);
    const metInfoRaw = parseMetInfoJson(friend.met_info, this.logger);
    const socialProfiles = parseSocialProfilesJson(friend.social_profiles, this.logger);
    const relationships = parseRelationshipsJson(friend.relationships, this.logger);
    const circles = parseCirclesJson(friend.circles, this.logger);
    const professionalHistory = parseProfessionalHistoryJson(
      friend.professional_history,
      this.logger,
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
        phoneType: parsePhoneType(p.phone_type),
        label: p.label ?? undefined,
        isPrimary: p.is_primary,
        createdAt: p.created_at,
      })),
      emails: emails.map((e) => ({
        id: e.external_id,
        emailAddress: e.email_address,
        emailType: parseEmailType(e.email_type),
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
        addressType: parseAddressType(a.address_type),
        label: a.label ?? undefined,
        isPrimary: a.is_primary,
        latitude: a.latitude ?? undefined,
        longitude: a.longitude ?? undefined,
        createdAt: a.created_at,
      })),
      urls: urls.map((u) => ({
        id: u.external_id,
        url: u.url,
        urlType: parseUrlType(u.url_type),
        label: u.label ?? undefined,
        createdAt: u.created_at,
      })),
      dates: dates.map((d) => ({
        id: d.external_id,
        dateValue: d.date_value,
        yearKnown: d.year_known,
        dateType: parseDateType(d.date_type),
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
        platform: parseSocialPlatform(sp.platform),
        profileUrl: sp.profile_url ?? undefined,
        username: sp.username ?? undefined,
        createdAt: sp.created_at,
      })),
      relationships: relationships.map((r) => ({
        id: r.external_id,
        relatedFriendId: r.related_friend_external_id,
        relatedFriendDisplayName: r.related_friend_display_name,
        relatedFriendPhotoThumbnailUrl: r.related_friend_photo_thumbnail_url ?? undefined,
        relationshipTypeId: parseRelationshipTypeId(r.relationship_type_id),
        relationshipTypeLabel: r.relationship_type_label,
        relationshipCategory: parseRelationshipCategory(r.relationship_category),
        notes: r.notes ?? undefined,
        createdAt: r.created_at,
      })),
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
}
