import type {
  Address,
  AddressInput,
  DateInput,
  Email,
  EmailInput,
  FacetedSearchOptions,
  FacetedSearchResponse,
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
  PaginatedFriendList,
  PaginatedSearchResponse,
  Phone,
  PhoneInput,
  ProfessionalHistory,
  ProfessionalHistoryInput,
  Relationship,
  RelationshipInput,
  RelationshipTypesGrouped,
  RelationshipUpdateInput,
  SearchOptions,
  SocialProfile,
  SocialProfileInput,
  UpcomingDate,
  Url,
  UrlInput,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { refreshFieldMeta } from '../../models/queries/data-quality.queries.js';
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
import {
  parseAddressesJson,
  parseCirclesJson,
  parseDatesJson,
  parseEmailsJson,
  parseMetInfoJson,
  parsePhonesJson,
  parseProfessionalHistoryJson,
  parseRelationshipsJson,
  parseSocialProfilesJson,
  parseUrlsJson,
} from '../../utils/db-json-schemas.js';
import { FriendCreationError, toError } from '../../utils/errors.js';
import {
  parseAddressType,
  parseDateType,
  parseEmailType,
  parsePhoneType,
  parseRelationshipCategory,
  parseRelationshipTypeId,
  parseSocialPlatform,
  parseUrlType,
} from '../../utils/type-guards.js';
import type { AddressLookupService } from '../address-lookup.service.js';
import { PhotoService } from '../photo.service.js';
import { NetworkGraphService } from './network-graph.service.js';
import { RelationshipService } from './relationship.service.js';
import { SearchService } from './search.service.js';
import { AddressService } from './sub-resources/address.service.js';
import { DateService } from './sub-resources/date.service.js';
import { EmailService } from './sub-resources/email.service.js';
import { MetInfoService } from './sub-resources/met-info.service.js';
import { PhoneService } from './sub-resources/phone.service.js';
import { ProfessionalHistoryService } from './sub-resources/professional-history.service.js';
import { SocialProfileService } from './sub-resources/social-profile.service.js';
import { UrlService } from './sub-resources/url.service.js';

/**
 * FriendsService is the main orchestrator for friend-related operations.
 * It delegates to specialized services for specific functionality.
 */
export class FriendsService {
  private db: pg.Pool;
  private logger: Logger;
  private _addressLookupService?: AddressLookupService;

  // Lazy-loaded service instances
  private _searchService?: SearchService;
  private _relationshipService?: RelationshipService;
  private _networkGraphService?: NetworkGraphService;
  private _phoneService?: PhoneService;
  private _emailService?: EmailService;
  private _addressService?: AddressService;
  private _urlService?: UrlService;
  private _dateService?: DateService;
  private _socialProfileService?: SocialProfileService;
  private _professionalHistoryService?: ProfessionalHistoryService;
  private _metInfoService?: MetInfoService;

  constructor(db: pg.Pool, logger: Logger, addressLookupService?: AddressLookupService) {
    this.db = db;
    this.logger = logger;
    this._addressLookupService = addressLookupService;
  }

  // ============================================================================
  // Service Accessors (lazy initialization)
  // ============================================================================

  private get searchService(): SearchService {
    if (!this._searchService) {
      this._searchService = new SearchService({ db: this.db, logger: this.logger });
    }
    return this._searchService;
  }

  private get relationshipService(): RelationshipService {
    if (!this._relationshipService) {
      this._relationshipService = new RelationshipService({ db: this.db, logger: this.logger });
    }
    return this._relationshipService;
  }

  private get networkGraphService(): NetworkGraphService {
    if (!this._networkGraphService) {
      this._networkGraphService = new NetworkGraphService({ db: this.db, logger: this.logger });
    }
    return this._networkGraphService;
  }

  private get phoneService(): PhoneService {
    if (!this._phoneService) {
      this._phoneService = new PhoneService({ db: this.db, logger: this.logger });
    }
    return this._phoneService;
  }

  private get emailService(): EmailService {
    if (!this._emailService) {
      this._emailService = new EmailService({ db: this.db, logger: this.logger });
    }
    return this._emailService;
  }

  private get addressService(): AddressService {
    if (!this._addressService) {
      this._addressService = new AddressService({
        db: this.db,
        logger: this.logger,
        addressLookupService: this._addressLookupService,
      });
    }
    return this._addressService;
  }

  private get urlService(): UrlService {
    if (!this._urlService) {
      this._urlService = new UrlService({ db: this.db, logger: this.logger });
    }
    return this._urlService;
  }

  private get dateService(): DateService {
    if (!this._dateService) {
      this._dateService = new DateService({ db: this.db, logger: this.logger });
    }
    return this._dateService;
  }

  private get socialProfileService(): SocialProfileService {
    if (!this._socialProfileService) {
      this._socialProfileService = new SocialProfileService({ db: this.db, logger: this.logger });
    }
    return this._socialProfileService;
  }

  private get professionalHistoryService(): ProfessionalHistoryService {
    if (!this._professionalHistoryService) {
      this._professionalHistoryService = new ProfessionalHistoryService({
        db: this.db,
        logger: this.logger,
      });
    }
    return this._professionalHistoryService;
  }

  private get metInfoService(): MetInfoService {
    if (!this._metInfoService) {
      this._metInfoService = new MetInfoService({ db: this.db, logger: this.logger });
    }
    return this._metInfoService;
  }

  // ============================================================================
  // Data Quality
  // ============================================================================

  /**
   * Recompute data-quality provenance for a friend. Fingerprint-based, so it is a
   * no-op when nothing actually changed. Never allowed to fail a user-facing write.
   */
  private async refreshFieldMeta(userExternalId: string, friendExternalId: string): Promise<void> {
    try {
      await refreshFieldMeta.run({ userExternalId, friendExternalId, source: 'manual' }, this.db);
    } catch (error) {
      this.logger.warn({ err: toError(error), friendExternalId }, 'Failed to refresh field meta');
    }
  }

  // ============================================================================
  // Friend CRUD Operations
  // ============================================================================

  /**
   * List friends for a user with pagination and sorting
   */
  async listFriends(
    userExternalId: string,
    options: FriendListOptions,
  ): Promise<PaginatedFriendList> {
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
        favoritesOnly: options.favorites ?? false,
      },
      this.db,
    );

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
   * Create a new friend with optional sub-resources
   */
  async createFriend(userExternalId: string, data: FriendCreateInput): Promise<Friend> {
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
    let metInfo: MetInfo | undefined;

    try {
      await client.query('BEGIN');

      const [created] = await createFriend.run(
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
        data.phones ?? [],
        client,
      );
      emails = await this.emailService.createMany(
        userExternalId,
        friendExternalId,
        data.emails ?? [],
        client,
      );
      addresses = await this.addressService.createMany(
        userExternalId,
        friendExternalId,
        data.addresses ?? [],
        client,
      );
      urls = await this.urlService.createMany(
        userExternalId,
        friendExternalId,
        data.urls ?? [],
        client,
      );
      dates = await this.dateService.createMany(
        userExternalId,
        friendExternalId,
        data.dates ?? [],
        client,
      );
      socialProfiles = await this.socialProfileService.createMany(
        userExternalId,
        friendExternalId,
        data.social_profiles ?? [],
        client,
      );
      professionalHistory = await this.professionalHistoryService.createMany(
        userExternalId,
        friendExternalId,
        data.professional_history ?? [],
        client,
      );

      if (data.met_info) {
        metInfo =
          (await this.metInfoService.set(
            userExternalId,
            friendExternalId,
            data.met_info,
            client,
          )) ?? undefined;
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

    // After COMMIT, so current_field_state sees the committed sub-resources.
    await this.refreshFieldMeta(userExternalId, friend.external_id);

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

    await this.refreshFieldMeta(userExternalId, friendExternalId);

    this.logger.info({ friendExternalId }, 'Friend updated successfully');

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

    // Remove photo files here rather than in the route, so every caller of
    // deleteFriend cleans them up. Best-effort: a missing file must not fail
    // the delete.
    try {
      await new PhotoService(this.logger).deletePhoto(friendExternalId);
    } catch (error) {
      this.logger.warn({ error, friendExternalId }, 'Failed to delete friend photos');
    }

    this.logger.info({ friendExternalId }, 'Friend deleted successfully');
    return true;
  }

  // ============================================================================
  // Phone Methods (delegated)
  // ============================================================================

  async addPhone(
    userExternalId: string,
    friendExternalId: string,
    data: PhoneInput,
  ): Promise<Phone | null> {
    const result = await this.phoneService.add(userExternalId, friendExternalId, data);
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async updatePhone(
    userExternalId: string,
    friendExternalId: string,
    phoneExternalId: string,
    data: PhoneInput,
  ): Promise<Phone | null> {
    const result = await this.phoneService.update(
      userExternalId,
      friendExternalId,
      phoneExternalId,
      data,
    );
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async deletePhone(
    userExternalId: string,
    friendExternalId: string,
    phoneExternalId: string,
  ): Promise<boolean> {
    const deleted = await this.phoneService.delete(
      userExternalId,
      friendExternalId,
      phoneExternalId,
    );
    if (deleted) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return deleted;
  }

  // ============================================================================
  // Email Methods (delegated)
  // ============================================================================

  async addEmail(
    userExternalId: string,
    friendExternalId: string,
    data: EmailInput,
  ): Promise<Email | null> {
    const result = await this.emailService.add(userExternalId, friendExternalId, data);
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async updateEmail(
    userExternalId: string,
    friendExternalId: string,
    emailExternalId: string,
    data: EmailInput,
  ): Promise<Email | null> {
    const result = await this.emailService.update(
      userExternalId,
      friendExternalId,
      emailExternalId,
      data,
    );
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async deleteEmail(
    userExternalId: string,
    friendExternalId: string,
    emailExternalId: string,
  ): Promise<boolean> {
    const deleted = await this.emailService.delete(
      userExternalId,
      friendExternalId,
      emailExternalId,
    );
    if (deleted) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return deleted;
  }

  // ============================================================================
  // Address Methods (delegated)
  // ============================================================================

  async addAddress(
    userExternalId: string,
    friendExternalId: string,
    data: AddressInput,
  ): Promise<Address | null> {
    const result = await this.addressService.add(userExternalId, friendExternalId, data);
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async updateAddress(
    userExternalId: string,
    friendExternalId: string,
    addressExternalId: string,
    data: AddressInput,
  ): Promise<Address | null> {
    const result = await this.addressService.update(
      userExternalId,
      friendExternalId,
      addressExternalId,
      data,
    );
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async deleteAddress(
    userExternalId: string,
    friendExternalId: string,
    addressExternalId: string,
  ): Promise<boolean> {
    const deleted = await this.addressService.delete(
      userExternalId,
      friendExternalId,
      addressExternalId,
    );
    if (deleted) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return deleted;
  }

  // ============================================================================
  // URL Methods (delegated)
  // ============================================================================

  async addUrl(
    userExternalId: string,
    friendExternalId: string,
    data: UrlInput,
  ): Promise<Url | null> {
    return this.urlService.add(userExternalId, friendExternalId, data);
  }

  async updateUrl(
    userExternalId: string,
    friendExternalId: string,
    urlExternalId: string,
    data: UrlInput,
  ): Promise<Url | null> {
    return this.urlService.update(userExternalId, friendExternalId, urlExternalId, data);
  }

  async deleteUrl(
    userExternalId: string,
    friendExternalId: string,
    urlExternalId: string,
  ): Promise<boolean> {
    return this.urlService.delete(userExternalId, friendExternalId, urlExternalId);
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

    const updated = result.length > 0;
    if (updated) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }

    return updated;
  }

  // ============================================================================
  // Favorites & Archive Methods
  // ============================================================================

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
      return false;
    }

    this.logger.info({ friendExternalId }, 'Friend archived');

    return true;
  }

  async unarchiveFriend(userExternalId: string, friendExternalId: string): Promise<boolean> {
    this.logger.debug({ friendExternalId }, 'Unarchiving friend');

    const [result] = await unarchiveFriend.run({ userExternalId, friendExternalId }, this.db);

    if (!result) {
      return false;
    }

    this.logger.info({ friendExternalId }, 'Friend unarchived');

    return true;
  }

  // ============================================================================
  // Date Methods (delegated)
  // ============================================================================

  async addDate(
    userExternalId: string,
    friendExternalId: string,
    data: DateInput,
  ): Promise<FriendDate | null> {
    const result = await this.dateService.add(userExternalId, friendExternalId, data);
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async updateDate(
    userExternalId: string,
    friendExternalId: string,
    dateExternalId: string,
    data: DateInput,
  ): Promise<FriendDate | null> {
    const result = await this.dateService.update(
      userExternalId,
      friendExternalId,
      dateExternalId,
      data,
    );
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async deleteDate(
    userExternalId: string,
    friendExternalId: string,
    dateExternalId: string,
  ): Promise<boolean> {
    const deleted = await this.dateService.delete(userExternalId, friendExternalId, dateExternalId);
    if (deleted) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return deleted;
  }

  async getUpcomingDates(
    userExternalId: string,
    options: { days?: number; limit?: number } = {},
  ): Promise<UpcomingDate[]> {
    return this.dateService.getUpcomingDates(userExternalId, options);
  }

  // ============================================================================
  // Met Info Methods (delegated)
  // ============================================================================

  async setMetInfo(
    userExternalId: string,
    friendExternalId: string,
    data: MetInfoInput,
  ): Promise<MetInfo | null> {
    const result = await this.metInfoService.set(userExternalId, friendExternalId, data);
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async deleteMetInfo(userExternalId: string, friendExternalId: string): Promise<boolean> {
    const deleted = await this.metInfoService.delete(userExternalId, friendExternalId);
    if (deleted) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return deleted;
  }

  // ============================================================================
  // Social Profile Methods (delegated)
  // ============================================================================

  async addSocialProfile(
    userExternalId: string,
    friendExternalId: string,
    data: SocialProfileInput,
  ): Promise<SocialProfile | null> {
    const result = await this.socialProfileService.add(userExternalId, friendExternalId, data);
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async updateSocialProfile(
    userExternalId: string,
    friendExternalId: string,
    profileExternalId: string,
    data: SocialProfileInput,
  ): Promise<SocialProfile | null> {
    const result = await this.socialProfileService.update(
      userExternalId,
      friendExternalId,
      profileExternalId,
      data,
    );
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async deleteSocialProfile(
    userExternalId: string,
    friendExternalId: string,
    profileExternalId: string,
  ): Promise<boolean> {
    const deleted = await this.socialProfileService.delete(
      userExternalId,
      friendExternalId,
      profileExternalId,
    );
    if (deleted) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return deleted;
  }

  // ============================================================================
  // Professional History Methods (delegated)
  // ============================================================================

  async addProfessionalHistory(
    userExternalId: string,
    friendExternalId: string,
    data: ProfessionalHistoryInput,
  ): Promise<ProfessionalHistory | null> {
    const result = await this.professionalHistoryService.add(
      userExternalId,
      friendExternalId,
      data,
    );
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async updateProfessionalHistory(
    userExternalId: string,
    friendExternalId: string,
    historyExternalId: string,
    data: ProfessionalHistoryInput,
  ): Promise<ProfessionalHistory | null> {
    const result = await this.professionalHistoryService.update(
      userExternalId,
      friendExternalId,
      historyExternalId,
      data,
    );
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return result;
  }

  async deleteProfessionalHistory(
    userExternalId: string,
    friendExternalId: string,
    historyExternalId: string,
  ): Promise<boolean> {
    const deleted = await this.professionalHistoryService.delete(
      userExternalId,
      friendExternalId,
      historyExternalId,
    );
    if (deleted) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return deleted;
  }

  // ============================================================================
  // Relationship Methods (delegated)
  // ============================================================================

  async getRelationshipTypes(): Promise<RelationshipTypesGrouped> {
    return this.relationshipService.getRelationshipTypes();
  }

  async addRelationship(
    userExternalId: string,
    friendExternalId: string,
    data: RelationshipInput,
  ): Promise<Relationship | null> {
    const result = await this.relationshipService.addRelationship(
      userExternalId,
      friendExternalId,
      data,
    );
    if (result !== null) {
      // An inverse edge is written on the other side too, so both friends'
      // `family` presence can change.
      await this.refreshFieldMeta(userExternalId, friendExternalId);
      await this.refreshFieldMeta(userExternalId, result.relatedFriendId);
    }
    return result;
  }

  async updateRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
    data: RelationshipUpdateInput,
  ): Promise<Relationship | null> {
    const result = await this.relationshipService.updateRelationship(
      userExternalId,
      friendExternalId,
      relationshipExternalId,
      data,
    );
    if (result !== null) {
      await this.refreshFieldMeta(userExternalId, friendExternalId);
      await this.refreshFieldMeta(userExternalId, result.relatedFriendId);
    }
    return result;
  }

  async deleteRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
  ): Promise<boolean> {
    const deleted = await this.relationshipService.deleteRelationship(
      userExternalId,
      friendExternalId,
      relationshipExternalId,
    );
    if (deleted) {
      // Only this side is refreshed: the deleted row no longer identifies the
      // other friend. The other side's `family` provenance is then merely
      // conservative — it keeps a value that is gone, which suppresses a
      // suggestion rather than raising a wrong one, and self-heals on the next
      // write to that friend.
      await this.refreshFieldMeta(userExternalId, friendExternalId);
    }
    return deleted;
  }

  async searchFriends(
    userExternalId: string,
    query: string,
    excludeFriendExternalId?: string,
    limit = 10,
  ): Promise<FriendSearchResult[]> {
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

  async fullTextSearch(
    userExternalId: string,
    query: string,
    limit = 10,
  ): Promise<GlobalSearchResult[]> {
    return this.searchService.fullTextSearch(userExternalId, query, limit);
  }

  async paginatedSearch(
    userExternalId: string,
    options: SearchOptions,
  ): Promise<PaginatedSearchResponse> {
    return this.searchService.paginatedSearch(userExternalId, options);
  }

  async facetedSearch(
    userExternalId: string,
    options: FacetedSearchOptions,
  ): Promise<FacetedSearchResponse> {
    return this.searchService.facetedSearch(userExternalId, options);
  }

  async filterOnlyList(
    userExternalId: string,
    options: FacetedSearchOptions,
  ): Promise<FacetedSearchResponse> {
    return this.searchService.filterOnlyList(userExternalId, options);
  }

  async getRecentSearches(userExternalId: string, limit = 10): Promise<string[]> {
    return this.searchService.getRecentSearches(userExternalId, limit);
  }

  async addRecentSearch(userExternalId: string, query: string): Promise<void> {
    return this.searchService.addRecentSearch(userExternalId, query);
  }

  async deleteRecentSearch(userExternalId: string, query: string): Promise<boolean> {
    return this.searchService.deleteRecentSearch(userExternalId, query);
  }

  async clearRecentSearches(userExternalId: string): Promise<void> {
    return this.searchService.clearRecentSearches(userExternalId);
  }

  // ============================================================================
  // Network Graph Methods (delegated)
  // ============================================================================

  async getNetworkGraphData(userExternalId: string): Promise<NetworkGraphData> {
    return this.networkGraphService.getNetworkGraphData(userExternalId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mapFriendListItem(row: IGetFriendsByUserIdResult): FriendListItem {
    const circlesRaw = parseCirclesJson(row.circles);

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

  private mapFriendWithEmbeddedRelations(friend: IGetFriendByIdResult): Friend {
    const phones = parsePhonesJson(friend.phones);
    const emails = parseEmailsJson(friend.emails);
    const addresses = parseAddressesJson(friend.addresses);
    const urls = parseUrlsJson(friend.urls);
    const dates = parseDatesJson(friend.dates);
    const metInfoRaw = parseMetInfoJson(friend.met_info);
    const socialProfiles = parseSocialProfilesJson(friend.social_profiles);
    const relationships = parseRelationshipsJson(friend.relationships);
    const circles = parseCirclesJson(friend.circles);
    const professionalHistory = parseProfessionalHistoryJson(friend.professional_history);

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
