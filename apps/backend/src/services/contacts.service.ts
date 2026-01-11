import type {
  Address,
  AddressInput,
  AddressType,
  Contact,
  ContactCreateInput,
  ContactDate,
  ContactListItem,
  ContactListOptions,
  ContactSearchResult,
  ContactUpdateInput,
  DateInput,
  DateType,
  Email,
  EmailInput,
  EmailType,
  FacetedSearchOptions,
  FacetedSearchResponse,
  FacetGroups,
  FacetValue,
  GlobalSearchResult,
  MetInfo,
  MetInfoInput,
  PaginatedContactList,
  PaginatedSearchResponse,
  Phone,
  PhoneInput,
  PhoneType,
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
  type IGetAddressesByContactIdResult,
  updateAddress,
} from '../models/queries/contact-addresses.queries.js';
import {
  countBirthdaysForContact,
  createDate,
  deleteDate,
  getUpcomingDates,
  type IGetDatesByContactIdResult,
  type IGetUpcomingDatesResult,
  updateDate,
} from '../models/queries/contact-dates.queries.js';
import {
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  type IGetEmailsByContactIdResult,
  updateEmail,
} from '../models/queries/contact-emails.queries.js';
import {
  deleteMetInfo,
  type IGetMetInfoByContactIdResult,
  upsertMetInfo,
} from '../models/queries/contact-met-info.queries.js';
import {
  clearPrimaryPhone,
  createPhone,
  deletePhone,
  type IGetPhonesByContactIdResult,
  updatePhone,
} from '../models/queries/contact-phones.queries.js';
import {
  createInverseRelationship,
  createRelationship,
  deleteInverseRelationship,
  deleteRelationship,
  getAllRelationshipTypes,
  getRelationshipById,
  type IGetRelationshipsByContactIdResult,
  searchContacts,
  updateRelationship,
} from '../models/queries/contact-relationships.queries.js';
import {
  createSocialProfile,
  deleteSocialProfile,
  type IGetSocialProfilesByContactIdResult,
  updateSocialProfile,
} from '../models/queries/contact-social-profiles.queries.js';
import {
  createUrl,
  deleteUrl,
  type IGetUrlsByContactIdResult,
  updateUrl,
} from '../models/queries/contact-urls.queries.js';
import {
  createContact,
  getContactById,
  getContactsByUserId,
  type IGetContactByIdResult,
  type IGetContactsByUserIdResult,
  softDeleteContact,
  updateContact,
  updateContactPhoto,
} from '../models/queries/contacts.queries.js';
import {
  addRecentSearch,
  clearRecentSearches,
  deleteRecentSearch,
  facetedSearch,
  filterOnlyList,
  fullTextSearchContacts,
  getAllFacetCounts,
  getFacetCounts,
  getRecentSearches,
  type IFacetedSearchResult,
  type IFilterOnlyListResult,
  type IFullTextSearchContactsResult,
  type IGetFacetCountsResult,
  type IPaginatedFullTextSearchResult,
  paginatedFullTextSearch,
} from '../models/queries/search.queries.js';
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

// ============================================================================
// Contacts Error Classes
// ============================================================================

/**
 * Thrown when trying to add a birthday date to a contact that already has one
 */
export class DuplicateBirthdayError extends Error {
  constructor() {
    super('Contact already has a birthday date');
    this.name = 'DuplicateBirthdayError';
  }
}

export class ContactsService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(db: pg.Pool, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * List contacts for a user with pagination and sorting
   * Uses a single query with CTE to get both data and total count
   */
  async listContacts(
    userExternalId: string,
    options: ContactListOptions,
  ): Promise<PaginatedContactList> {
    this.logger.debug({ userExternalId, options }, 'Listing contacts');

    const offset = (options.page - 1) * options.pageSize;

    const contacts = await getContactsByUserId.run(
      {
        userExternalId,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
        pageSize: options.pageSize,
        offset,
      },
      this.db,
    );

    // Total count is included in each row via CROSS JOIN with the count CTE
    const total = contacts[0]?.total_count ?? 0;

    return {
      contacts: contacts.map((c) => this.mapContactListItem(c)),
      total,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil(total / options.pageSize),
    };
  }

  /**
   * Get a single contact by ID with all related data
   * Uses a single query with json_agg subqueries for efficiency
   */
  async getContactById(userExternalId: string, contactExternalId: string): Promise<Contact | null> {
    this.logger.debug({ userExternalId, contactExternalId }, 'Getting contact');

    const [contact] = await getContactById.run({ userExternalId, contactExternalId }, this.db);

    if (!contact) {
      return null;
    }

    return this.mapContactWithEmbeddedRelations(contact);
  }

  /**
   * Create a new contact with optional phones, emails, addresses, URLs, dates, met info, and social profiles
   */
  async createContact(userExternalId: string, data: ContactCreateInput): Promise<Contact> {
    this.logger.info({ userExternalId, displayName: data.display_name }, 'Creating contact');

    const [contact] = await createContact.run(
      {
        userExternalId,
        displayName: data.display_name,
        nickname: data.nickname ?? null,
        namePrefix: data.name_prefix ?? null,
        nameFirst: data.name_first ?? null,
        nameMiddle: data.name_middle ?? null,
        nameLast: data.name_last ?? null,
        nameSuffix: data.name_suffix ?? null,
        // Epic 1B: Professional fields
        jobTitle: data.job_title ?? null,
        organization: data.organization ?? null,
        department: data.department ?? null,
        workNotes: data.work_notes ?? null,
        interests: data.interests ?? null,
      },
      this.db,
    );

    if (!contact) {
      this.logger.error({ userExternalId }, 'Failed to create contact');
      throw new Error('Failed to create contact');
    }

    const contactExternalId = contact.external_id;

    // Create sub-resources in parallel (Epic 1A + 1B)
    const [phones, emails, addresses, urls, dates, socialProfiles] = await Promise.all([
      this.createPhones(userExternalId, contactExternalId, data.phones ?? []),
      this.createEmails(userExternalId, contactExternalId, data.emails ?? []),
      this.createAddresses(userExternalId, contactExternalId, data.addresses ?? []),
      this.createUrls(userExternalId, contactExternalId, data.urls ?? []),
      this.createDates(userExternalId, contactExternalId, data.dates ?? []),
      this.createSocialProfiles(userExternalId, contactExternalId, data.social_profiles ?? []),
    ]);

    // Create met info if provided (single record)
    let metInfo: MetInfo | undefined;
    if (data.met_info) {
      metInfo =
        (await this.setMetInfo(userExternalId, contactExternalId, data.met_info)) ?? undefined;
    }

    this.logger.info(
      { contactExternalId, displayName: data.display_name },
      'Contact created successfully',
    );

    return {
      id: contact.external_id,
      displayName: contact.display_name,
      nickname: contact.nickname ?? undefined,
      namePrefix: contact.name_prefix ?? undefined,
      nameFirst: contact.name_first ?? undefined,
      nameMiddle: contact.name_middle ?? undefined,
      nameLast: contact.name_last ?? undefined,
      nameSuffix: contact.name_suffix ?? undefined,
      photoUrl: contact.photo_url ?? undefined,
      photoThumbnailUrl: contact.photo_thumbnail_url ?? undefined,
      // Epic 1B: Professional fields
      jobTitle: contact.job_title ?? undefined,
      organization: contact.organization ?? undefined,
      department: contact.department ?? undefined,
      workNotes: contact.work_notes ?? undefined,
      interests: contact.interests ?? undefined,
      phones,
      emails,
      addresses,
      urls,
      dates,
      metInfo,
      socialProfiles,
      createdAt: contact.created_at.toISOString(),
      updatedAt: contact.updated_at.toISOString(),
    };
  }

  /**
   * Update an existing contact
   */
  async updateContact(
    userExternalId: string,
    contactExternalId: string,
    data: ContactUpdateInput,
  ): Promise<Contact | null> {
    this.logger.info({ userExternalId, contactExternalId }, 'Updating contact');

    const [updated] = await updateContact.run(
      {
        userExternalId,
        contactExternalId,
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
        // Epic 1B: Professional fields
        updateJobTitle: 'job_title' in data,
        jobTitle: data.job_title ?? null,
        updateOrganization: 'organization' in data,
        organization: data.organization ?? null,
        updateDepartment: 'department' in data,
        department: data.department ?? null,
        updateWorkNotes: 'work_notes' in data,
        workNotes: data.work_notes ?? null,
        updateInterests: 'interests' in data,
        interests: data.interests ?? null,
      },
      this.db,
    );

    if (!updated) {
      return null;
    }

    this.logger.info({ contactExternalId }, 'Contact updated successfully');

    // Fetch the full contact with related data using the optimized query
    return this.getContactById(userExternalId, contactExternalId);
  }

  /**
   * Soft delete a contact
   */
  async deleteContact(userExternalId: string, contactExternalId: string): Promise<boolean> {
    this.logger.info({ userExternalId, contactExternalId }, 'Deleting contact');

    const result = await softDeleteContact.run({ userExternalId, contactExternalId }, this.db);

    if (result.length === 0) {
      return false;
    }

    this.logger.info({ contactExternalId }, 'Contact deleted successfully');
    return true;
  }

  // ============================================================================
  // Phone Methods
  // ============================================================================

  async addPhone(
    userExternalId: string,
    contactExternalId: string,
    data: PhoneInput,
  ): Promise<Phone | null> {
    this.logger.debug({ contactExternalId }, 'Adding phone');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryPhone.run({ userExternalId, contactExternalId }, this.db);
    }

    const [phone] = await createPhone.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    phoneExternalId: string,
    data: PhoneInput,
  ): Promise<Phone | null> {
    this.logger.debug({ contactExternalId, phoneExternalId }, 'Updating phone');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryPhone.run({ userExternalId, contactExternalId }, this.db);
    }

    const [phone] = await updatePhone.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    phoneExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ contactExternalId, phoneExternalId }, 'Deleting phone');

    const result = await deletePhone.run(
      { userExternalId, contactExternalId, phoneExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Email Methods
  // ============================================================================

  async addEmail(
    userExternalId: string,
    contactExternalId: string,
    data: EmailInput,
  ): Promise<Email | null> {
    this.logger.debug({ contactExternalId }, 'Adding email');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryEmail.run({ userExternalId, contactExternalId }, this.db);
    }

    const [email] = await createEmail.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    emailExternalId: string,
    data: EmailInput,
  ): Promise<Email | null> {
    this.logger.debug({ contactExternalId, emailExternalId }, 'Updating email');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryEmail.run({ userExternalId, contactExternalId }, this.db);
    }

    const [email] = await updateEmail.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    emailExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ contactExternalId, emailExternalId }, 'Deleting email');

    const result = await deleteEmail.run(
      { userExternalId, contactExternalId, emailExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Address Methods
  // ============================================================================

  async addAddress(
    userExternalId: string,
    contactExternalId: string,
    data: AddressInput,
  ): Promise<Address | null> {
    this.logger.debug({ contactExternalId }, 'Adding address');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryAddress.run({ userExternalId, contactExternalId }, this.db);
    }

    const [address] = await createAddress.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    addressExternalId: string,
    data: AddressInput,
  ): Promise<Address | null> {
    this.logger.debug({ contactExternalId, addressExternalId }, 'Updating address');

    // If setting as primary, clear existing primary
    if (data.is_primary) {
      await clearPrimaryAddress.run({ userExternalId, contactExternalId }, this.db);
    }

    const [address] = await updateAddress.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    addressExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ contactExternalId, addressExternalId }, 'Deleting address');

    const result = await deleteAddress.run(
      { userExternalId, contactExternalId, addressExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // URL Methods
  // ============================================================================

  async addUrl(
    userExternalId: string,
    contactExternalId: string,
    data: UrlInput,
  ): Promise<Url | null> {
    this.logger.debug({ contactExternalId }, 'Adding URL');

    const [url] = await createUrl.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    urlExternalId: string,
    data: UrlInput,
  ): Promise<Url | null> {
    this.logger.debug({ contactExternalId, urlExternalId }, 'Updating URL');

    const [url] = await updateUrl.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    urlExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ contactExternalId, urlExternalId }, 'Deleting URL');

    const result = await deleteUrl.run(
      { userExternalId, contactExternalId, urlExternalId },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Photo Methods
  // ============================================================================

  async updatePhoto(
    userExternalId: string,
    contactExternalId: string,
    photoUrl: string | null,
    photoThumbnailUrl: string | null,
  ): Promise<boolean> {
    this.logger.debug({ contactExternalId }, 'Updating photo');

    const result = await updateContactPhoto.run(
      {
        userExternalId,
        contactExternalId,
        photoUrl,
        photoThumbnailUrl,
      },
      this.db,
    );

    return result.length > 0;
  }

  // ============================================================================
  // Date Methods (Epic 1B)
  // ============================================================================

  async addDate(
    userExternalId: string,
    contactExternalId: string,
    data: DateInput,
  ): Promise<ContactDate | null> {
    this.logger.debug({ contactExternalId }, 'Adding date');

    // Check birthday limit (only one birthday allowed per contact)
    if (data.date_type === 'birthday') {
      const [countResult] = await countBirthdaysForContact.run(
        { userExternalId, contactExternalId },
        this.db,
      );
      if (countResult && (countResult.count ?? 0) > 0) {
        throw new DuplicateBirthdayError();
      }
    }

    const [date] = await createDate.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    dateExternalId: string,
    data: DateInput,
  ): Promise<ContactDate | null> {
    this.logger.debug({ contactExternalId, dateExternalId }, 'Updating date');

    const [date] = await updateDate.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    dateExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ contactExternalId, dateExternalId }, 'Deleting date');

    const result = await deleteDate.run(
      { userExternalId, contactExternalId, dateExternalId },
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
    contactExternalId: string,
    data: MetInfoInput,
  ): Promise<MetInfo | null> {
    this.logger.debug({ contactExternalId }, 'Setting met info');

    const [metInfo] = await upsertMetInfo.run(
      {
        userExternalId,
        contactExternalId,
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

  async deleteMetInfo(userExternalId: string, contactExternalId: string): Promise<boolean> {
    this.logger.debug({ contactExternalId }, 'Deleting met info');

    const result = await deleteMetInfo.run({ userExternalId, contactExternalId }, this.db);

    return result.length > 0;
  }

  // ============================================================================
  // Social Profile Methods (Epic 1B)
  // ============================================================================

  async addSocialProfile(
    userExternalId: string,
    contactExternalId: string,
    data: SocialProfileInput,
  ): Promise<SocialProfile | null> {
    this.logger.debug({ contactExternalId }, 'Adding social profile');

    const [profile] = await createSocialProfile.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    profileExternalId: string,
    data: SocialProfileInput,
  ): Promise<SocialProfile | null> {
    this.logger.debug({ contactExternalId, profileExternalId }, 'Updating social profile');

    const [profile] = await updateSocialProfile.run(
      {
        userExternalId,
        contactExternalId,
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
    contactExternalId: string,
    profileExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ contactExternalId, profileExternalId }, 'Deleting social profile');

    const result = await deleteSocialProfile.run(
      { userExternalId, contactExternalId, profileExternalId },
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
   * Add a relationship between two contacts (creates inverse automatically)
   */
  async addRelationship(
    userExternalId: string,
    contactExternalId: string,
    data: RelationshipInput,
  ): Promise<Relationship | null> {
    this.logger.debug(
      { contactExternalId, relatedContactExternalId: data.related_contact_id },
      'Adding relationship',
    );

    // Create the primary relationship
    const [relationship] = await createRelationship.run(
      {
        userExternalId,
        contactExternalId,
        relatedContactExternalId: data.related_contact_id,
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
        contactExternalId,
        relatedContactExternalId: data.related_contact_id,
        relationshipTypeId: data.relationship_type_id,
        notes: data.notes ?? null,
      },
      this.db,
    );

    // Fetch the full relationship with related contact info
    const [fullRelationship] = await getRelationshipById.run(
      {
        userExternalId,
        contactExternalId,
        relationshipExternalId: relationship.external_id,
      },
      this.db,
    );

    if (!fullRelationship) {
      return null;
    }

    this.logger.info(
      {
        contactExternalId,
        relatedContactExternalId: data.related_contact_id,
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
    contactExternalId: string,
    relationshipExternalId: string,
    data: RelationshipUpdateInput,
  ): Promise<Relationship | null> {
    this.logger.debug({ contactExternalId, relationshipExternalId }, 'Updating relationship');

    const [updated] = await updateRelationship.run(
      {
        userExternalId,
        contactExternalId,
        relationshipExternalId,
        notes: data.notes ?? null,
      },
      this.db,
    );

    if (!updated) {
      return null;
    }

    // Fetch the full relationship with related contact info
    const [fullRelationship] = await getRelationshipById.run(
      {
        userExternalId,
        contactExternalId,
        relationshipExternalId,
      },
      this.db,
    );

    if (!fullRelationship) {
      return null;
    }

    this.logger.info({ contactExternalId, relationshipExternalId }, 'Relationship updated');

    return this.mapRelationship(fullRelationship);
  }

  /**
   * Delete a relationship (and its inverse)
   */
  async deleteRelationship(
    userExternalId: string,
    contactExternalId: string,
    relationshipExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ contactExternalId, relationshipExternalId }, 'Deleting relationship');

    // Delete the primary relationship and get related contact ID
    const [deleted] = await deleteRelationship.run(
      { userExternalId, contactExternalId, relationshipExternalId },
      this.db,
    );

    if (!deleted) {
      return false;
    }

    // Delete the inverse relationship
    await deleteInverseRelationship.run(
      {
        userExternalId,
        contactExternalId,
        relatedContactId: deleted.related_contact_id,
        relationshipTypeId: deleted.relationship_type_id,
      },
      this.db,
    );

    this.logger.info({ contactExternalId, relationshipExternalId }, 'Relationship deleted');

    return true;
  }

  /**
   * Search contacts by name (for autocomplete)
   */
  async searchContacts(
    userExternalId: string,
    query: string,
    excludeContactExternalId?: string,
    limit = 10,
  ): Promise<ContactSearchResult[]> {
    this.logger.debug({ query, excludeContactExternalId }, 'Searching contacts');

    const searchPattern = createWildcardQuery(query);

    const results = await searchContacts.run(
      {
        userExternalId,
        searchPattern,
        excludeContactExternalId: excludeContactExternalId ?? null,
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
   * Full-text search across contacts with relevance ranking
   * Searches: names, organization, job title, work notes, emails, phones,
   * relationship notes, and met context
   */
  async fullTextSearch(
    userExternalId: string,
    query: string,
    limit = 10,
  ): Promise<GlobalSearchResult[]> {
    this.logger.debug({ query, limit }, 'Full-text searching contacts');

    const results = await fullTextSearchContacts.run(
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
   * Used by in-page search for contacts list
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
      const facetRows = await getFacetCounts.run({ userExternalId, query, wildcardQuery }, this.db);
      response.facets = this.aggregateFacets(facetRows);
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

    // Fetch facet counts if requested (uses all contacts, not search-filtered)
    if (includeFacets) {
      const facetRows = await getAllFacetCounts.run({ userExternalId }, this.db);
      response.facets = this.aggregateFacets(facetRows);
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

  private mapGlobalSearchResult(row: IFullTextSearchContactsResult): GlobalSearchResult {
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
    };
  }

  private mapFacetedSearchResult(row: IFacetedSearchResult): GlobalSearchResult {
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
    };
  }

  private mapFilterOnlyResult(row: IFilterOnlyListResult): GlobalSearchResult {
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
    };
  }

  /**
   * Aggregate raw facet count rows into grouped facet structure
   */
  private aggregateFacets(rows: IGetFacetCountsResult[]): FacetGroups {
    const facets: FacetGroups = {
      location: [],
      professional: [],
      relationship: [],
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

    return facets;
  }

  private async createPhones(
    userExternalId: string,
    contactExternalId: string,
    phones: PhoneInput[],
  ): Promise<Phone[]> {
    const results: Phone[] = [];

    for (const phone of phones) {
      const created = await this.addPhone(userExternalId, contactExternalId, phone);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createEmails(
    userExternalId: string,
    contactExternalId: string,
    emails: EmailInput[],
  ): Promise<Email[]> {
    const results: Email[] = [];

    for (const email of emails) {
      const created = await this.addEmail(userExternalId, contactExternalId, email);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createAddresses(
    userExternalId: string,
    contactExternalId: string,
    addresses: AddressInput[],
  ): Promise<Address[]> {
    const results: Address[] = [];

    for (const address of addresses) {
      const created = await this.addAddress(userExternalId, contactExternalId, address);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createUrls(
    userExternalId: string,
    contactExternalId: string,
    urls: UrlInput[],
  ): Promise<Url[]> {
    const results: Url[] = [];

    for (const url of urls) {
      const created = await this.addUrl(userExternalId, contactExternalId, url);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createDates(
    userExternalId: string,
    contactExternalId: string,
    dates: DateInput[],
  ): Promise<ContactDate[]> {
    const results: ContactDate[] = [];

    for (const date of dates) {
      const created = await this.addDate(userExternalId, contactExternalId, date);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private async createSocialProfiles(
    userExternalId: string,
    contactExternalId: string,
    profiles: SocialProfileInput[],
  ): Promise<SocialProfile[]> {
    const results: SocialProfile[] = [];

    for (const profile of profiles) {
      const created = await this.addSocialProfile(userExternalId, contactExternalId, profile);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  private mapContactListItem(row: IGetContactsByUserIdResult): ContactListItem {
    return {
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      primaryEmail: row.primary_email ?? undefined,
      primaryPhone: row.primary_phone ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapPhone(row: IGetPhonesByContactIdResult): Phone {
    return {
      id: row.external_id,
      phoneNumber: row.phone_number,
      phoneType: row.phone_type as PhoneType,
      label: row.label ?? undefined,
      isPrimary: row.is_primary,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapEmail(row: IGetEmailsByContactIdResult): Email {
    return {
      id: row.external_id,
      emailAddress: row.email_address,
      emailType: row.email_type as EmailType,
      label: row.label ?? undefined,
      isPrimary: row.is_primary,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapAddress(row: IGetAddressesByContactIdResult): Address {
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

  private mapUrl(row: IGetUrlsByContactIdResult): Url {
    return {
      id: row.external_id,
      url: row.url,
      urlType: row.url_type as UrlType,
      label: row.label ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapDate(row: IGetDatesByContactIdResult): ContactDate {
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
      contact: {
        id: row.contact_external_id,
        displayName: row.contact_display_name,
        photoThumbnailUrl: row.contact_photo_thumbnail_url ?? undefined,
      },
    };
  }

  private mapMetInfo(row: IGetMetInfoByContactIdResult): MetInfo {
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

  private mapSocialProfile(row: IGetSocialProfilesByContactIdResult): SocialProfile {
    return {
      id: row.external_id,
      platform: row.platform as SocialPlatform,
      profileUrl: row.profile_url ?? undefined,
      username: row.username ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapRelationship(row: IGetRelationshipsByContactIdResult): Relationship {
    return {
      id: row.external_id,
      relatedContactId: row.related_contact_external_id,
      relatedContactDisplayName: row.related_contact_display_name,
      relatedContactPhotoThumbnailUrl: row.related_contact_photo_thumbnail_url ?? undefined,
      relationshipTypeId: row.relationship_type_id as RelationshipTypeId,
      relationshipTypeLabel: row.relationship_type_label,
      relationshipCategory: row.relationship_category as RelationshipCategory,
      notes: row.notes ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Maps a contact row with embedded JSON arrays for related data
   * Used by the optimized getContactById query
   */
  private mapContactWithEmbeddedRelations(contact: IGetContactByIdResult): Contact {
    // Parse JSON arrays (PostgreSQL returns them as parsed objects when using node-pg)
    const phones = (contact.phones || []) as Array<{
      external_id: string;
      phone_number: string;
      phone_type: string;
      label: string | null;
      is_primary: boolean;
      created_at: string;
    }>;

    const emails = (contact.emails || []) as Array<{
      external_id: string;
      email_address: string;
      email_type: string;
      label: string | null;
      is_primary: boolean;
      created_at: string;
    }>;

    const addresses = (contact.addresses || []) as Array<{
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

    const urls = (contact.urls || []) as Array<{
      external_id: string;
      url: string;
      url_type: string;
      label: string | null;
      created_at: string;
    }>;

    // Epic 1B: Parse new sub-resources
    const dates = (contact.dates || []) as Array<{
      external_id: string;
      date_value: string;
      year_known: boolean;
      date_type: string;
      label: string | null;
      created_at: string;
    }>;

    const metInfoRaw = contact.met_info as {
      external_id: string;
      met_date: string | null;
      met_location: string | null;
      met_context: string | null;
      created_at: string;
      updated_at: string;
    } | null;

    const socialProfiles = (contact.social_profiles || []) as Array<{
      external_id: string;
      platform: string;
      profile_url: string | null;
      username: string | null;
      created_at: string;
    }>;

    // Epic 1D: Relationships
    const relationships = (contact.relationships || []) as Array<{
      external_id: string;
      related_contact_external_id: string;
      related_contact_display_name: string;
      related_contact_photo_thumbnail_url: string | null;
      relationship_type_id: string;
      relationship_type_label: string;
      relationship_category: string;
      notes: string | null;
      created_at: string;
    }>;

    return {
      id: contact.external_id,
      displayName: contact.display_name,
      nickname: contact.nickname ?? undefined,
      namePrefix: contact.name_prefix ?? undefined,
      nameFirst: contact.name_first ?? undefined,
      nameMiddle: contact.name_middle ?? undefined,
      nameLast: contact.name_last ?? undefined,
      nameSuffix: contact.name_suffix ?? undefined,
      photoUrl: contact.photo_url ?? undefined,
      photoThumbnailUrl: contact.photo_thumbnail_url ?? undefined,
      // Epic 1B: Professional fields
      jobTitle: contact.job_title ?? undefined,
      organization: contact.organization ?? undefined,
      department: contact.department ?? undefined,
      workNotes: contact.work_notes ?? undefined,
      interests: contact.interests ?? undefined,
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
        relatedContactId: r.related_contact_external_id,
        relatedContactDisplayName: r.related_contact_display_name,
        relatedContactPhotoThumbnailUrl: r.related_contact_photo_thumbnail_url ?? undefined,
        relationshipTypeId: r.relationship_type_id as RelationshipTypeId,
        relationshipTypeLabel: r.relationship_type_label,
        relationshipCategory: r.relationship_category as RelationshipCategory,
        notes: r.notes ?? undefined,
        createdAt: r.created_at,
      })),
      createdAt: contact.created_at.toISOString(),
      updatedAt: contact.updated_at.toISOString(),
    };
  }
}
