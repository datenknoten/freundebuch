import type {
  Address,
  AddressInput,
  AddressType,
  Contact,
  ContactCreateInput,
  ContactListItem,
  ContactListOptions,
  ContactUpdateInput,
  Email,
  EmailInput,
  EmailType,
  PaginatedContactList,
  Phone,
  PhoneInput,
  PhoneType,
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
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  type IGetEmailsByContactIdResult,
  updateEmail,
} from '../models/queries/contact-emails.queries.js';
import {
  clearPrimaryPhone,
  createPhone,
  deletePhone,
  type IGetPhonesByContactIdResult,
  updatePhone,
} from '../models/queries/contact-phones.queries.js';
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
   * Create a new contact with optional phones, emails, addresses, and URLs
   */
  async createContact(userExternalId: string, data: ContactCreateInput): Promise<Contact> {
    this.logger.info({ userExternalId, displayName: data.display_name }, 'Creating contact');

    const [contact] = await createContact.run(
      {
        userExternalId,
        displayName: data.display_name,
        namePrefix: data.name_prefix ?? null,
        nameFirst: data.name_first ?? null,
        nameMiddle: data.name_middle ?? null,
        nameLast: data.name_last ?? null,
        nameSuffix: data.name_suffix ?? null,
      },
      this.db,
    );

    if (!contact) {
      this.logger.error({ userExternalId }, 'Failed to create contact');
      throw new Error('Failed to create contact');
    }

    const contactExternalId = contact.external_id;

    // Create sub-resources in parallel
    const [phones, emails, addresses, urls] = await Promise.all([
      this.createPhones(userExternalId, contactExternalId, data.phones ?? []),
      this.createEmails(userExternalId, contactExternalId, data.emails ?? []),
      this.createAddresses(userExternalId, contactExternalId, data.addresses ?? []),
      this.createUrls(userExternalId, contactExternalId, data.urls ?? []),
    ]);

    this.logger.info(
      { contactExternalId, displayName: data.display_name },
      'Contact created successfully',
    );

    return {
      id: contact.external_id,
      displayName: contact.display_name,
      namePrefix: contact.name_prefix ?? undefined,
      nameFirst: contact.name_first ?? undefined,
      nameMiddle: contact.name_middle ?? undefined,
      nameLast: contact.name_last ?? undefined,
      nameSuffix: contact.name_suffix ?? undefined,
      photoUrl: contact.photo_url ?? undefined,
      photoThumbnailUrl: contact.photo_thumbnail_url ?? undefined,
      phones,
      emails,
      addresses,
      urls,
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
  // Private Helper Methods
  // ============================================================================

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

    return {
      id: contact.external_id,
      displayName: contact.display_name,
      namePrefix: contact.name_prefix ?? undefined,
      nameFirst: contact.name_first ?? undefined,
      nameMiddle: contact.name_middle ?? undefined,
      nameLast: contact.name_last ?? undefined,
      nameSuffix: contact.name_suffix ?? undefined,
      photoUrl: contact.photo_url ?? undefined,
      photoThumbnailUrl: contact.photo_thumbnail_url ?? undefined,
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
      createdAt: contact.created_at.toISOString(),
      updatedAt: contact.updated_at.toISOString(),
    };
  }
}
