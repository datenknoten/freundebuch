import { type } from 'arktype';
import { isValidPhoneNumber } from 'libphonenumber-js';
import type { CircleSummary } from './circles.js';

/**
 * Friend types and validation schemas for Epic 1A & 1B: Friend CRUD & Extended Fields
 * Extended for Epic 4: Categorization & Organization (circles, favorites, archive)
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

// Professional History input schema

/** Schema for creating/updating a professional history entry */
export const ProfessionalHistoryInputSchema = type({
  'job_title?': 'string | null',
  'organization?': 'string | null',
  'department?': 'string | null',
  'notes?': 'string | null',
  from_month: '1 <= number.integer <= 12',
  from_year: 'number.integer',
  'to_month?': '1 <= number.integer <= 12 | null',
  'to_year?': 'number.integer | null',
  'is_primary?': 'boolean',
}).narrow((data, ctx) => {
  // At least one of job_title or organization must be provided
  const hasJobTitle = data.job_title && data.job_title.trim().length > 0;
  const hasOrganization = data.organization && data.organization.trim().length > 0;

  if (!hasJobTitle && !hasOrganization) {
    ctx.mustBe('a professional history entry with either job_title or organization');
    return false;
  }

  // to_month and to_year must both be NULL or both be set
  const hasToMonth = data.to_month !== null && data.to_month !== undefined;
  const hasToYear = data.to_year !== null && data.to_year !== undefined;

  if (hasToMonth !== hasToYear) {
    ctx.mustBe('a professional history entry with both to_month and to_year set or both null');
    return false;
  }

  // If both dates are set, end date must be >= start date
  if (hasToMonth && hasToYear) {
    const toYear = data.to_year as number;
    const toMonth = data.to_month as number;
    if (toYear < data.from_year || (toYear === data.from_year && toMonth < data.from_month)) {
      ctx.mustBe('a professional history entry with end date after or equal to start date');
      return false;
    }
  }

  return true;
});
export type ProfessionalHistoryInput = typeof ProfessionalHistoryInputSchema.infer;

// Epic 1D: Relationship input schemas

/** Schema for creating a relationship */
export const RelationshipInputSchema = type({
  related_friend_id: 'string > 0', // UUID of the related friend
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
// Friend Request Schemas
// ============================================================================

/** Maximum number of sub-resources per friend (DoS prevention) */
const MAX_SUB_RESOURCES = 30;

/** Schema for creating a new friend */
export const FriendCreateSchema = type({
  display_name: 'string > 0',
  'nickname?': 'string',
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
  // Professional history (replaces job_title, organization, department, work_notes)
  'professional_history?': ProfessionalHistoryInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  // Personal interests (not employment-related)
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
      ctx.mustBe('a friend with at most one primary phone');
      return false;
    }
  }
  // Validate only one primary email
  if (data.emails) {
    const primaryCount = data.emails.filter((e) => e.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a friend with at most one primary email');
      return false;
    }
  }
  // Validate only one primary address
  if (data.addresses) {
    const primaryCount = data.addresses.filter((a) => a.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a friend with at most one primary address');
      return false;
    }
  }
  // Validate only one birthday date
  if (data.dates) {
    const birthdayCount = data.dates.filter((d) => d.date_type === 'birthday').length;
    if (birthdayCount > 1) {
      ctx.mustBe('a friend with at most one birthday');
      return false;
    }
  }
  // Validate only one primary professional history entry
  if (data.professional_history) {
    const primaryCount = data.professional_history.filter((p) => p.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a friend with at most one primary professional history entry');
      return false;
    }
  }
  return true;
});
export type FriendCreateInput = typeof FriendCreateSchema.infer;

/** Schema for updating an existing friend */
export const FriendUpdateSchema = type({
  'display_name?': 'string > 0',
  'nickname?': 'string | null',
  'name_prefix?': 'string | null',
  'name_first?': 'string | null',
  'name_middle?': 'string | null',
  'name_last?': 'string | null',
  'name_suffix?': 'string | null',
  // Personal interests (not employment-related)
  'interests?': 'string | null',
});
export type FriendUpdateInput = typeof FriendUpdateSchema.infer;

// ============================================================================
// Query Schemas
// ============================================================================

/** Schema for friend list query parameters */
export const FriendListQuerySchema = type({
  'page?': 'string',
  'pageSize?': 'string',
  'sortBy?': '"display_name" | "created_at" | "updated_at"',
  'sortOrder?': '"asc" | "desc"',
  // Epic 4: Categorization & Organization filters
  'favorites?': 'string', // 'true' to show only favorites
  'archived?': 'string', // 'true' to include archived, 'only' to show only archived
});
export type FriendListQuery = typeof FriendListQuerySchema.infer;

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
export interface FriendDate {
  id: string;
  dateValue: string;
  yearKnown: boolean;
  dateType: DateType;
  label?: string;
  createdAt: string;
}

/** Upcoming date with friend info for dashboard */
export interface UpcomingDate {
  id: string;
  dateValue: string;
  yearKnown: boolean;
  dateType: DateType;
  label?: string;
  daysUntil: number;
  friend: {
    id: string;
    displayName: string;
    photoThumbnailUrl?: string;
  };
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

/** Professional history entry in API responses */
export interface ProfessionalHistory {
  id: string;
  jobTitle?: string;
  organization?: string;
  department?: string;
  notes?: string;
  fromMonth: number;
  fromYear: number;
  toMonth?: number | null;
  toYear?: number | null;
  isPrimary: boolean;
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
  relatedFriendId: string;
  relatedFriendDisplayName: string;
  relatedFriendPhotoThumbnailUrl?: string;
  relationshipTypeId: RelationshipTypeId;
  relationshipTypeLabel: string;
  relationshipCategory: RelationshipCategory;
  notes?: string;
  createdAt: string;
}

/** Full friend with all sub-resources */
export interface Friend {
  id: string;
  displayName: string;
  nickname?: string;
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
  // Professional history (employment records with date ranges)
  professionalHistory: ProfessionalHistory[];
  // Personal interests (not employment-related)
  interests?: string;
  // Epic 1B: Extended sub-resources (optional for backwards compatibility)
  dates?: FriendDate[];
  metInfo?: MetInfo;
  socialProfiles?: SocialProfile[];
  // Epic 1D: Relationships
  relationships?: Relationship[];
  // Epic 4: Categorization & Organization
  circles: CircleSummary[];
  isFavorite: boolean;
  archivedAt?: string;
  archiveReason?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/** Contact summary for list views */
export interface FriendListItem {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  // Extended fields for dynamic columns
  nickname?: string;
  organization?: string;
  jobTitle?: string;
  department?: string;
  primaryCity?: string;
  primaryCountry?: string;
  birthday?: string;
  // Epic 4: Categorization & Organization
  circles: CircleSummary[];
  isFavorite: boolean;
  archivedAt?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/** Contact search result for autocomplete */
export interface FriendSearchResult {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
}

/** Global search result with relevance ranking and context (Epic 10) */
export interface GlobalSearchResult {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
  organization?: string;
  jobTitle?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  /** Relevance score from full-text search */
  rank: number;
  /** HTML snippet with <mark> tags highlighting matched terms, null for filter-only results */
  headline: string | null;
  /** Where the match was found: friend fields, email, phone, or notes */
  matchSource: 'friend' | 'email' | 'phone' | 'notes' | null;
  /** Circles the friend belongs to */
  circles: CircleSummary[];
}

/** Unified grid item that works for both normal listing and search results */
export interface FriendGridItem {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  // Extended fields for dynamic columns
  nickname?: string;
  organization?: string;
  jobTitle?: string;
  department?: string;
  primaryCity?: string;
  primaryCountry?: string;
  birthday?: string;
  // Categorization
  circles: CircleSummary[];
  isFavorite?: boolean;
  archivedAt?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  // Search-specific fields (optional, only present for search results)
  rank?: number;
  headline?: string | null;
  matchSource?: 'friend' | 'email' | 'phone' | 'notes' | null;
}

/** Convert FriendListItem to FriendGridItem */
export function toFriendGridItem(item: FriendListItem): FriendGridItem {
  return {
    id: item.id,
    displayName: item.displayName,
    photoThumbnailUrl: item.photoThumbnailUrl,
    primaryEmail: item.primaryEmail,
    primaryPhone: item.primaryPhone,
    nickname: item.nickname,
    organization: item.organization,
    jobTitle: item.jobTitle,
    department: item.department,
    primaryCity: item.primaryCity,
    primaryCountry: item.primaryCountry,
    birthday: item.birthday,
    circles: item.circles,
    isFavorite: item.isFavorite,
    archivedAt: item.archivedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** Convert GlobalSearchResult to FriendGridItem */
export function searchResultToFriendGridItem(result: GlobalSearchResult): FriendGridItem {
  return {
    id: result.id,
    displayName: result.displayName,
    photoThumbnailUrl: result.photoThumbnailUrl,
    primaryEmail: result.primaryEmail,
    primaryPhone: result.primaryPhone,
    organization: result.organization,
    jobTitle: result.jobTitle,
    circles: result.circles,
    rank: result.rank,
    headline: result.headline,
    matchSource: result.matchSource,
  };
}

/** Sort options for search results */
export const SearchSortBySchema = type(
  '"relevance" | "display_name" | "created_at" | "updated_at"',
);
export type SearchSortBy = typeof SearchSortBySchema.infer;

/** Schema for search query parameters */
export const SearchQuerySchema = type({
  q: 'string > 0',
  'page?': 'string',
  'pageSize?': 'string',
  'sortBy?': SearchSortBySchema,
  'sortOrder?': '"asc" | "desc"',
});
export type SearchQuery = typeof SearchQuerySchema.infer;

/** Parsed search options */
export interface SearchOptions {
  query: string;
  page: number;
  pageSize: number;
  sortBy: SearchSortBy;
  sortOrder: 'asc' | 'desc';
}

/**
 * Parse and validate search query parameters
 */
export function parseSearchQuery(query: SearchQuery): SearchOptions {
  const sortBy = query.sortBy || 'relevance';
  return {
    query: query.q.trim(),
    page: query.page ? Math.max(1, Number.parseInt(query.page, 10) || 1) : 1,
    pageSize: query.pageSize
      ? Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 25))
      : 25,
    sortBy,
    // Default sort order: desc for relevance (best first), asc for name
    sortOrder:
      query.sortOrder ||
      (sortBy === 'relevance' ? 'desc' : sortBy === 'display_name' ? 'asc' : 'desc'),
  };
}

/** Paginated search response */
export interface PaginatedSearchResponse {
  results: GlobalSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Paginated friend list response */
export interface PaginatedFriendList {
  friends: FriendListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Parsed query options for list endpoint */
export interface FriendListOptions {
  page: number;
  pageSize: number;
  sortBy: 'display_name' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  // Epic 4: Categorization & Organization filters
  favorites?: boolean;
  archived?: boolean | 'only'; // true = include, 'only' = only archived, undefined/false = exclude
}

/**
 * Parse and validate friend list query parameters
 */
export function parseFriendListQuery(query: FriendListQuery): FriendListOptions {
  // Epic 4: Parse archived filter
  let archived: boolean | 'only' | undefined;
  if (query.archived === 'true') {
    archived = true;
  } else if (query.archived === 'only') {
    archived = 'only';
  }

  return {
    page: query.page ? Math.max(1, Number.parseInt(query.page, 10) || 1) : 1,
    pageSize: query.pageSize
      ? Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 25))
      : 25,
    sortBy: query.sortBy || 'display_name',
    sortOrder: query.sortOrder || 'asc',
    // Epic 4: Categorization & Organization filters
    favorites: query.favorites === 'true',
    archived,
  };
}

// ============================================================================
// Faceted Search Types (Epic 10 Enhancement)
// ============================================================================

/** Active facet filter selections */
export interface FacetFilters {
  country?: string[];
  city?: string[];
  organization?: string[];
  job_title?: string[];
  department?: string[];
  relationship_category?: RelationshipCategory[];
  // Epic 4: Categorization & Organization
  circles?: string[]; // Circle external_ids
  favorites?: boolean;
  archived?: 'include' | 'exclude' | 'only'; // 'include' shows all, 'exclude' hides archived (default), 'only' shows only archived
}

/** Fields that are array-type filters (for facet UI components) */
export type ArrayFacetField =
  | 'country'
  | 'city'
  | 'organization'
  | 'job_title'
  | 'department'
  | 'relationship_category'
  | 'circles';

/** Helper to check if a field is an array facet field */
export function isArrayFacetField(field: keyof FacetFilters): field is ArrayFacetField {
  return [
    'country',
    'city',
    'organization',
    'job_title',
    'department',
    'relationship_category',
    'circles',
  ].includes(field);
}

/** Single facet value with count of matching friends */
export interface FacetValue {
  value: string;
  count: number;
}

/** Collection of facet values for a specific field (array-type facets only) */
export interface FacetGroup {
  field: ArrayFacetField;
  label: string;
  values: FacetValue[];
}

/** Circle facet with color for display */
export interface CircleFacetValue {
  value: string; // external_id
  label: string; // circle name
  color: string;
  count: number;
}

/** Facets organized by category */
export interface FacetGroups {
  location: FacetGroup[];
  professional: FacetGroup[];
  relationship: FacetGroup[];
  circles: CircleFacetValue[];
}

/** Paginated search response with optional facet data */
export interface FacetedSearchResponse extends PaginatedSearchResponse {
  facets?: FacetGroups;
}

/** Schema for faceted search query parameters */
export const FacetedSearchQuerySchema = type({
  'q?': 'string', // Optional - can search with query OR filter-only
  'page?': 'string',
  'pageSize?': 'string',
  'sortBy?': SearchSortBySchema,
  'sortOrder?': '"asc" | "desc"',
  // Facet filters (comma-separated values)
  'country?': 'string',
  'city?': 'string',
  'organization?': 'string',
  'job_title?': 'string',
  'department?': 'string',
  'relationship_category?': 'string',
  // Epic 4: Categorization & Organization filters
  'circles?': 'string', // Comma-separated circle external_ids
  'favorites?': 'string', // 'true' to filter favorites only
  'archived?': 'string', // 'include', 'exclude' (default), or 'only'
  // Whether to include facet counts in response
  'includeFacets?': 'string',
});
export type FacetedSearchQuery = typeof FacetedSearchQuerySchema.infer;

/** Parsed faceted search options */
export interface FacetedSearchOptions {
  query?: string; // Optional - can search with query OR filter-only
  page: number;
  pageSize: number;
  sortBy: SearchSortBy;
  sortOrder: 'asc' | 'desc';
  filters: FacetFilters;
  includeFacets: boolean;
}

/**
 * Parse and validate faceted search query parameters
 */
// ============================================================================
// Network Graph Types (Dashboard visualization)
// ============================================================================

/** Node in the relationship network graph */
export interface NetworkGraphNode {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
  isFavorite: boolean;
}

/** Link in the relationship network graph */
export interface NetworkGraphLink {
  source: string;
  target: string;
  relationshipType: RelationshipTypeId;
  relationshipCategory: RelationshipCategory;
  relationshipLabel: string;
}

/** Network graph data for visualization */
export interface NetworkGraphData {
  nodes: NetworkGraphNode[];
  links: NetworkGraphLink[];
}

export function parseFacetedSearchQuery(query: FacetedSearchQuery): FacetedSearchOptions {
  const sortBy = query.sortBy || (query.q ? 'relevance' : 'display_name');

  // Parse comma-separated filter values
  const parseFilterArray = (value: string | undefined): string[] | undefined => {
    if (!value) return undefined;
    const values = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return values.length > 0 ? values : undefined;
  };

  // Parse archived filter
  const parseArchivedFilter = (
    value: string | undefined,
  ): 'include' | 'exclude' | 'only' | undefined => {
    if (value === 'include' || value === 'exclude' || value === 'only') {
      return value;
    }
    return undefined; // Default to 'exclude' in the backend
  };

  return {
    query: query.q?.trim(), // Optional query
    page: query.page ? Math.max(1, Number.parseInt(query.page, 10) || 1) : 1,
    pageSize: query.pageSize
      ? Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 25))
      : 25,
    sortBy,
    sortOrder:
      query.sortOrder ||
      (sortBy === 'relevance' ? 'desc' : sortBy === 'display_name' ? 'asc' : 'desc'),
    filters: {
      country: parseFilterArray(query.country),
      city: parseFilterArray(query.city),
      organization: parseFilterArray(query.organization),
      job_title: parseFilterArray(query.job_title),
      department: parseFilterArray(query.department),
      relationship_category: parseFilterArray(query.relationship_category) as
        | RelationshipCategory[]
        | undefined,
      // Epic 4: Categorization & Organization filters
      circles: parseFilterArray(query.circles),
      favorites: query.favorites === 'true' ? true : undefined,
      archived: parseArchivedFilter(query.archived),
    },
    includeFacets: query.includeFacets === 'true',
  };
}
