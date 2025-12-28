import { type } from 'arktype';
import { isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Contact types and validation schemas for Epic 1A & 1B: Contact CRUD & Extended Fields
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

// Epic 1B: Extended field type enums
export const DateTypeSchema = type('"birthday" | "anniversary" | "other"');
export type DateType = typeof DateTypeSchema.infer;

export const SocialPlatformSchema = type(
  '"linkedin" | "twitter" | "facebook" | "instagram" | "github" | "other"',
);
export type SocialPlatform = typeof SocialPlatformSchema.infer;

// Epic 1D: Relationship type enums
export const RelationshipCategorySchema = type('"family" | "professional" | "social"');
export type RelationshipCategory = typeof RelationshipCategorySchema.infer;

export const RelationshipTypeIdSchema = type(
  '"spouse" | "parent" | "child" | "sibling" | "grandparent" | "grandchild" | "cousin" | "in_law" | "other_family" | "colleague" | "manager" | "report" | "mentor" | "mentee" | "client" | "other_professional" | "friend" | "neighbor" | "acquaintance" | "other_social"',
);
export type RelationshipTypeId = typeof RelationshipTypeIdSchema.infer;

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

// Epic 1B: Extended field input schemas

/** Schema for creating/updating an important date */
export const DateInputSchema = type({
  date_value: 'string', // ISO date string YYYY-MM-DD
  'year_known?': 'boolean',
  date_type: DateTypeSchema,
  'label?': 'string',
});
export type DateInput = typeof DateInputSchema.infer;

/** Schema for creating/updating met information */
export const MetInfoInputSchema = type({
  'met_date?': 'string | null', // ISO date string or null
  'met_location?': 'string | null',
  'met_context?': 'string | null',
});
export type MetInfoInput = typeof MetInfoInputSchema.infer;

// Simple URL pattern for validation
const URL_PATTERN = /^https?:\/\/.+/i;

/** Schema for creating/updating a social profile */
export const SocialProfileInputSchema = type({
  platform: SocialPlatformSchema,
  'profile_url?': 'string | null',
  'username?': 'string | null',
}).narrow((data, ctx) => {
  // At least one of profile_url or username must be provided (non-empty)
  const hasUrl = data.profile_url && data.profile_url.trim().length > 0;
  const hasUsername = data.username && data.username.trim().length > 0;

  if (!hasUrl && !hasUsername) {
    ctx.mustBe('a social profile with either profile_url or username');
    return false;
  }

  // If profile_url is provided and non-empty, validate it's a valid URL
  if (hasUrl && !URL_PATTERN.test(data.profile_url as string)) {
    ctx.mustBe('a social profile with a valid URL (must start with http:// or https://)');
    return false;
  }

  return true;
});
export type SocialProfileInput = typeof SocialProfileInputSchema.infer;

// Epic 1D: Relationship input schemas

/** Schema for creating a relationship */
export const RelationshipInputSchema = type({
  related_contact_id: 'string > 0', // UUID of the related contact
  relationship_type_id: RelationshipTypeIdSchema,
  'notes?': 'string',
});
export type RelationshipInput = typeof RelationshipInputSchema.infer;

/** Schema for updating a relationship (only notes can be updated) */
export const RelationshipUpdateSchema = type({
  'notes?': 'string | null',
});
export type RelationshipUpdateInput = typeof RelationshipUpdateSchema.infer;

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
  // Epic 1A sub-resources
  'phones?': PhoneInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'emails?': EmailInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'addresses?': AddressInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'urls?': UrlInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  // Epic 1B: Professional fields
  'job_title?': 'string',
  'organization?': 'string',
  'department?': 'string',
  'work_notes?': 'string',
  'interests?': 'string',
  // Epic 1B: Extended sub-resources
  'dates?': DateInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'met_info?': MetInfoInputSchema,
  'social_profiles?': SocialProfileInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
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
  // Validate only one birthday date
  if (data.dates) {
    const birthdayCount = data.dates.filter((d) => d.date_type === 'birthday').length;
    if (birthdayCount > 1) {
      ctx.mustBe('a contact with at most one birthday');
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
  // Epic 1B: Professional fields (nullable to allow clearing)
  'job_title?': 'string | null',
  'organization?': 'string | null',
  'department?': 'string | null',
  'work_notes?': 'string | null',
  'interests?': 'string | null',
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

// Epic 1B: Extended field response interfaces

/** Important date in API responses */
export interface ContactDate {
  id: string;
  dateValue: string;
  yearKnown: boolean;
  dateType: DateType;
  label?: string;
  createdAt: string;
}

/** Met information in API responses */
export interface MetInfo {
  id: string;
  metDate?: string;
  metLocation?: string;
  metContext?: string;
  createdAt: string;
  updatedAt: string;
}

/** Social profile in API responses */
export interface SocialProfile {
  id: string;
  platform: SocialPlatform;
  profileUrl?: string;
  username?: string;
  createdAt: string;
}

// Epic 1D: Relationship response interfaces

/** Relationship type definition */
export interface RelationshipType {
  id: RelationshipTypeId;
  category: RelationshipCategory;
  label: string;
  inverseTypeId: RelationshipTypeId;
}

/** Relationship types grouped by category */
export interface RelationshipTypesGrouped {
  family: RelationshipType[];
  professional: RelationshipType[];
  social: RelationshipType[];
}

/** Relationship in API responses */
export interface Relationship {
  id: string;
  relatedContactId: string;
  relatedContactDisplayName: string;
  relatedContactPhotoThumbnailUrl?: string;
  relationshipTypeId: RelationshipTypeId;
  relationshipTypeLabel: string;
  relationshipCategory: RelationshipCategory;
  notes?: string;
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
  // Epic 1A sub-resources
  phones: Phone[];
  emails: Email[];
  addresses: Address[];
  urls: Url[];
  // Epic 1B: Professional fields
  jobTitle?: string;
  organization?: string;
  department?: string;
  workNotes?: string;
  interests?: string;
  // Epic 1B: Extended sub-resources (optional for backwards compatibility)
  dates?: ContactDate[];
  metInfo?: MetInfo;
  socialProfiles?: SocialProfile[];
  // Epic 1D: Relationships
  relationships?: Relationship[];
  // Timestamps
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

/** Contact search result for autocomplete */
export interface ContactSearchResult {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
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
