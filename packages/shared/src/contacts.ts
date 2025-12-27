import { type } from 'arktype';
import { isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Contact types and validation schemas for Epic 1A: Core Contact CRUD
 */

// ============================================================================
// Type Enums
// ============================================================================

export const PhoneTypeSchema = type('"mobile" | "home" | "work" | "fax" | "other"');
export type PhoneType = typeof PhoneTypeSchema.infer;

export const EmailTypeSchema = type('"personal" | "work" | "other"');
export type EmailType = typeof EmailTypeSchema.infer;

export const AddressTypeSchema = type('"home" | "work" | "other"');
export type AddressType = typeof AddressTypeSchema.infer;

export const UrlTypeSchema = type('"personal" | "work" | "blog" | "other"');
export type UrlType = typeof UrlTypeSchema.infer;

// ============================================================================
// Sub-resource Request Schemas
// ============================================================================

/** Schema for creating/updating a phone number */
export const PhoneInputSchema = type({
  phone_number: 'string > 0',
  phone_type: PhoneTypeSchema,
  'label?': 'string',
  'is_primary?': 'boolean',
}).narrow((data, ctx) => {
  if (!isValidPhoneNumber(data.phone_number)) {
    ctx.mustBe('a valid phone number');
    return false;
  }
  return true;
});
export type PhoneInput = typeof PhoneInputSchema.infer;

/** Schema for creating/updating an email address */
export const EmailInputSchema = type({
  email_address: 'string.email',
  email_type: EmailTypeSchema,
  'label?': 'string',
  'is_primary?': 'boolean',
});
export type EmailInput = typeof EmailInputSchema.infer;

/** Schema for creating/updating an address */
export const AddressInputSchema = type({
  'street_line1?': 'string',
  'street_line2?': 'string',
  'city?': 'string',
  'state_province?': 'string',
  'postal_code?': 'string',
  'country?': 'string',
  address_type: AddressTypeSchema,
  'label?': 'string',
  'is_primary?': 'boolean',
});
export type AddressInput = typeof AddressInputSchema.infer;

/** Schema for creating/updating a URL */
export const UrlInputSchema = type({
  url: 'string.url',
  url_type: UrlTypeSchema,
  'label?': 'string',
});
export type UrlInput = typeof UrlInputSchema.infer;

// ============================================================================
// Contact Request Schemas
// ============================================================================

/** Maximum number of sub-resources per contact (DoS prevention) */
const MAX_SUB_RESOURCES = 30;

/** Schema for creating a new contact */
export const ContactCreateSchema = type({
  display_name: 'string > 0',
  'name_prefix?': 'string',
  'name_first?': 'string',
  'name_middle?': 'string',
  'name_last?': 'string',
  'name_suffix?': 'string',
  'phones?': PhoneInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'emails?': EmailInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'addresses?': AddressInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'urls?': UrlInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
}).narrow((data, ctx) => {
  // Validate only one primary phone
  if (data.phones) {
    const primaryCount = data.phones.filter((p) => p.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a contact with at most one primary phone');
      return false;
    }
  }
  // Validate only one primary email
  if (data.emails) {
    const primaryCount = data.emails.filter((e) => e.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a contact with at most one primary email');
      return false;
    }
  }
  // Validate only one primary address
  if (data.addresses) {
    const primaryCount = data.addresses.filter((a) => a.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a contact with at most one primary address');
      return false;
    }
  }
  return true;
});
export type ContactCreateInput = typeof ContactCreateSchema.infer;

/** Schema for updating an existing contact */
export const ContactUpdateSchema = type({
  'display_name?': 'string > 0',
  'name_prefix?': 'string | null',
  'name_first?': 'string | null',
  'name_middle?': 'string | null',
  'name_last?': 'string | null',
  'name_suffix?': 'string | null',
});
export type ContactUpdateInput = typeof ContactUpdateSchema.infer;

// ============================================================================
// Query Schemas
// ============================================================================

/** Schema for contact list query parameters */
export const ContactListQuerySchema = type({
  'page?': 'string',
  'pageSize?': 'string',
  'sortBy?': '"display_name" | "created_at" | "updated_at"',
  'sortOrder?': '"asc" | "desc"',
});
export type ContactListQuery = typeof ContactListQuerySchema.infer;

// ============================================================================
// Response Interfaces
// ============================================================================

/** Phone number in API responses */
export interface Phone {
  id: string;
  phoneNumber: string;
  phoneType: PhoneType;
  label?: string;
  isPrimary: boolean;
  createdAt: string;
}

/** Email address in API responses */
export interface Email {
  id: string;
  emailAddress: string;
  emailType: EmailType;
  label?: string;
  isPrimary: boolean;
  createdAt: string;
}

/** Postal address in API responses */
export interface Address {
  id: string;
  streetLine1?: string;
  streetLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  addressType: AddressType;
  label?: string;
  isPrimary: boolean;
  createdAt: string;
}

/** URL/website in API responses */
export interface Url {
  id: string;
  url: string;
  urlType: UrlType;
  label?: string;
  createdAt: string;
}

/** Full contact with all sub-resources */
export interface Contact {
  id: string;
  displayName: string;
  namePrefix?: string;
  nameFirst?: string;
  nameMiddle?: string;
  nameLast?: string;
  nameSuffix?: string;
  photoUrl?: string;
  photoThumbnailUrl?: string;
  phones: Phone[];
  emails: Email[];
  addresses: Address[];
  urls: Url[];
  createdAt: string;
  updatedAt: string;
}

/** Contact summary for list views */
export interface ContactListItem {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  createdAt: string;
  updatedAt: string;
}

/** Paginated contact list response */
export interface PaginatedContactList {
  contacts: ContactListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Parsed query options for list endpoint */
export interface ContactListOptions {
  page: number;
  pageSize: number;
  sortBy: 'display_name' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

/**
 * Parse and validate contact list query parameters
 */
export function parseContactListQuery(query: ContactListQuery): ContactListOptions {
  return {
    page: query.page ? Math.max(1, Number.parseInt(query.page, 10) || 1) : 1,
    pageSize: query.pageSize
      ? Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 25))
      : 25,
    sortBy: query.sortBy || 'display_name',
    sortOrder: query.sortOrder || 'asc',
  };
}
