import { type } from 'arktype';

/**
 * Collective types and validation schemas for Epic 12: Collectives
 *
 * Collectives are entities that group contacts together (families, companies, clubs)
 * with automatic relationship creation based on roles.
 */

// ============================================================================
// Input Schemas
// ============================================================================

/** Schema for creating a collective */
export const CollectiveInputSchema = type({
  name: 'string > 0',
  collective_type_id: 'string', // External ID of the collective type
  'notes?': 'string | null',
  'photo_url?': 'string | null',
  'photo_thumbnail_url?': 'string | null',
  'address_street_line1?': 'string | null',
  'address_street_line2?': 'string | null',
  'address_city?': 'string | null',
  'address_state_province?': 'string | null',
  'address_postal_code?': 'string | null',
  'address_country?': 'string | null',
}).narrow((data, ctx) => {
  // Validate name length
  if (data.name.trim().length === 0) {
    ctx.mustBe('a collective with a non-empty name');
    return false;
  }
  if (data.name.length > 200) {
    ctx.mustBe('a collective with a name of 200 characters or less');
    return false;
  }
  return true;
});
export type CollectiveInput = typeof CollectiveInputSchema.infer;

/** Schema for updating a collective (all fields optional) */
export const CollectiveUpdateSchema = type({
  'name?': 'string > 0',
  'notes?': 'string | null',
  'photo_url?': 'string | null',
  'photo_thumbnail_url?': 'string | null',
  'address_street_line1?': 'string | null',
  'address_street_line2?': 'string | null',
  'address_city?': 'string | null',
  'address_state_province?': 'string | null',
  'address_postal_code?': 'string | null',
  'address_country?': 'string | null',
}).narrow((data, ctx) => {
  // Validate name length if provided
  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      ctx.mustBe('a collective with a non-empty name');
      return false;
    }
    if (data.name.length > 200) {
      ctx.mustBe('a collective with a name of 200 characters or less');
      return false;
    }
  }
  return true;
});
export type CollectiveUpdate = typeof CollectiveUpdateSchema.infer;

/** Schema for adding a member to a collective */
export const MembershipInputSchema = type({
  friend_id: 'string', // External ID of the friend
  role_id: 'string', // External ID of the role
  'joined_date?': 'string | null', // ISO date string (YYYY-MM-DD)
  'notes?': 'string | null',
  'skip_auto_relationships?': 'boolean', // If true, skip auto-relationship creation
}).narrow((data, ctx) => {
  // Validate date format if provided
  if (data.joined_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.joined_date)) {
    ctx.mustBe('a membership with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});
export type MembershipInput = typeof MembershipInputSchema.infer;

/** Schema for updating a membership */
export const MembershipUpdateSchema = type({
  'role_id?': 'string', // External ID of the role
  'joined_date?': 'string | null',
  'notes?': 'string | null',
}).narrow((data, ctx) => {
  // Validate date format if provided
  if (data.joined_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.joined_date)) {
    ctx.mustBe('a membership with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});
export type MembershipUpdate = typeof MembershipUpdateSchema.infer;

/** Schema for deactivating a membership */
export const MembershipDeactivateSchema = type({
  'reason?': 'string | null',
  'inactive_date?': 'string | null', // ISO date string (YYYY-MM-DD)
}).narrow((data, ctx) => {
  // Validate date format if provided
  if (data.inactive_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.inactive_date)) {
    ctx.mustBe('a deactivation with a valid date (YYYY-MM-DD format)');
    return false;
  }
  return true;
});
export type MembershipDeactivate = typeof MembershipDeactivateSchema.infer;

/** Schema for relationship preview request */
export const RelationshipPreviewRequestSchema = type({
  friend_id: 'string', // External ID of the friend to add
  role_id: 'string', // External ID of the role
});
export type RelationshipPreviewRequest = typeof RelationshipPreviewRequestSchema.infer;

/** Schema for collective list query parameters */
export const CollectiveListQuerySchema = type({
  'page?': 'string',
  'page_size?': 'string',
  'type_id?': 'string', // Filter by collective type external_id
  'search?': 'string', // Search in name/notes
  'include_deleted?': 'string', // "true" to include soft-deleted collectives
});
export type CollectiveListQuery = typeof CollectiveListQuerySchema.infer;

/** Parsed collective list options */
export interface CollectiveListOptions {
  page: number;
  pageSize: number;
  typeId?: string;
  search?: string;
  includeDeleted?: boolean;
}

/**
 * Parse and validate collective list query parameters
 */
export function parseCollectiveListQuery(query: CollectiveListQuery): CollectiveListOptions {
  const page = query.page ? parseInt(query.page, 10) : 1;
  const pageSize = query.page_size ? parseInt(query.page_size, 10) : 20;

  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    pageSize: Number.isNaN(pageSize) || pageSize < 1 ? 20 : Math.min(pageSize, 100),
    typeId: query.type_id || undefined,
    search: query.search || undefined,
    includeDeleted: query.include_deleted === 'true',
  };
}

// ============================================================================
// Response Interfaces
// ============================================================================

/** Role within a collective type */
export interface CollectiveRole {
  id: string; // external_id
  roleKey: string;
  label: string;
  sortOrder: number;
}

/** Relationship rule for a collective type */
export interface CollectiveRelationshipRule {
  newMemberRoleId: string;
  newMemberRoleKey: string;
  existingMemberRoleId: string;
  existingMemberRoleKey: string;
  relationshipTypeId: string;
  relationshipDirection: 'new_member' | 'existing_member' | 'both';
}

/** Collective type in API responses */
export interface CollectiveType {
  id: string; // external_id
  name: string;
  description: string | null;
  isSystemDefault: boolean;
  roles: CollectiveRole[];
  rules?: CollectiveRelationshipRule[]; // Only included in detail responses
  createdAt: string;
  updatedAt: string;
}

/** Address structure for collectives */
export interface CollectiveAddress {
  streetLine1: string | null;
  streetLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
}

/** Contact summary for embedding in collective member responses */
export interface CollectiveMemberContact {
  id: string;
  displayName: string;
  photoUrl: string | null;
}

/** Member of a collective */
export interface CollectiveMember {
  id: string; // membership external_id
  contact: CollectiveMemberContact;
  role: CollectiveRole;
  isActive: boolean;
  inactiveReason: string | null;
  inactiveDate: string | null;
  joinedDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Full collective in API responses */
export interface Collective {
  id: string; // external_id
  name: string;
  type: CollectiveType;
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
  notes: string | null;
  address: CollectiveAddress;
  memberCount: number;
  activeMemberCount: number;
  members: CollectiveMember[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Collective in list responses (fewer details) */
export interface CollectiveListItem {
  id: string; // external_id
  name: string;
  type: {
    id: string;
    name: string;
  };
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
  memberCount: number;
  activeMemberCount: number;
  memberPreview: CollectiveMemberContact[]; // First few members for preview
  createdAt: string;
  deletedAt: string | null;
}

/** Paginated collective list response */
export interface CollectiveListResponse {
  collectives: CollectiveListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

/** Preview of a relationship that will be created */
export interface RelationshipPreviewItem {
  fromContact: CollectiveMemberContact;
  toContact: CollectiveMemberContact;
  relationshipType: {
    id: string;
    label: string;
    category: string;
  };
  alreadyExists: boolean; // If true, this relationship already exists
}

/** Response for relationship preview endpoint */
export interface RelationshipPreviewResponse {
  newContact: CollectiveMemberContact;
  role: CollectiveRole;
  relationships: RelationshipPreviewItem[];
  existingRelationshipsSkipped: number; // Count of relationships that already exist
}

/** Collective type list response (for type selector) */
export interface CollectiveTypeListResponse {
  types: CollectiveType[];
}

/** Summary of collective for contact detail page */
export interface ContactCollectiveSummary {
  id: string;
  name: string;
  typeName: string;
  role: CollectiveRole;
  membershipId: string;
  isActive: boolean;
}
