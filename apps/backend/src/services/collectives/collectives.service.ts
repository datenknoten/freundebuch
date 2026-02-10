import type {
  Collective,
  CollectiveAddress,
  CollectiveInput,
  CollectiveListItem,
  CollectiveListOptions,
  CollectiveListResponse,
  CollectiveMember,
  CollectiveMemberContact,
  CollectiveRole,
  CollectiveType,
  CollectiveUpdate,
  ContactCollectiveSummary,
} from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import {
  countCollectivesByUserId,
  createCollective,
  deleteCollective,
  getCollectiveById,
  getCollectivesByUserId,
  getCollectivesForContact,
  getMemberPreviewBatch,
  getMembersByCollectiveId,
  getRolesForType,
  type IGetCollectiveByIdResult,
  type IGetCollectivesByUserIdResult,
  type IGetCollectivesForContactResult,
  type IGetMemberPreviewBatchResult,
  type IGetMembersByCollectiveIdResult,
  type IGetRolesForTypeResult,
  updateCollective,
} from '../../models/queries/collectives.queries.js';
import { CollectiveCreationError, CollectiveNotFoundError } from '../../utils/errors.js';

const PREVIEW_MEMBER_LIMIT = 3;

/** Escape special ILIKE pattern characters to prevent wildcard injection */
function escapeIlike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Service for managing collectives (families, companies, clubs, friend groups)
 */
export class CollectivesService {
  constructor(private db: Pool) {}

  // ============================================================================
  // Collective CRUD
  // ============================================================================

  /**
   * List all collectives for a user with pagination and filtering
   */
  async listCollectives(
    userExternalId: string,
    options: CollectiveListOptions,
  ): Promise<CollectiveListResponse> {
    const offset = (options.page - 1) * options.pageSize;
    const escapedSearch = options.search ? escapeIlike(options.search) : null;

    // Get collectives and count in parallel
    const [collectivesResult, countResult] = await Promise.all([
      getCollectivesByUserId.run(
        {
          userExternalId,
          includeDeleted: options.includeDeleted ?? false,
          typeExternalId: options.typeId ?? null,
          search: escapedSearch,
          pageSize: options.pageSize,
          offset,
        },
        this.db,
      ),
      countCollectivesByUserId.run(
        {
          userExternalId,
          includeDeleted: options.includeDeleted ?? false,
          typeExternalId: options.typeId ?? null,
          search: escapedSearch,
        },
        this.db,
      ),
    ]);

    const totalCount = countResult[0]?.total_count ?? 0;

    // Get member previews for all collectives in a single batch query
    const collectiveIds = collectivesResult.map((row) => row.external_id);
    const allPreviews =
      collectiveIds.length > 0
        ? await getMemberPreviewBatch.run(
            { collectiveExternalIds: collectiveIds, limit: PREVIEW_MEMBER_LIMIT },
            this.db,
          )
        : [];

    // Group previews by collective ID
    const previewsByCollective = new Map<string, IGetMemberPreviewBatchResult[]>();
    for (const preview of allPreviews) {
      const existing = previewsByCollective.get(preview.collective_external_id) ?? [];
      existing.push(preview);
      previewsByCollective.set(preview.collective_external_id, existing);
    }

    const collectives: CollectiveListItem[] = collectivesResult.map((row) => {
      const members = previewsByCollective.get(row.external_id) ?? [];
      return this.mapCollectiveListItem(row, members);
    });

    return {
      collectives,
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / options.pageSize),
      },
    };
  }

  /**
   * Get a single collective by ID with all members
   */
  async getCollectiveById(
    userExternalId: string,
    collectiveExternalId: string,
  ): Promise<Collective | null> {
    const results = await getCollectiveById.run({ userExternalId, collectiveExternalId }, this.db);

    if (results.length === 0) {
      return null;
    }

    const collectiveRow = results[0];

    // Fetch members and roles in parallel
    const [membersResult, rolesResult] = await Promise.all([
      getMembersByCollectiveId.run(
        { userExternalId, collectiveExternalId, includeInactive: true },
        this.db,
      ),
      getRolesForType.run({ typeExternalId: collectiveRow.type_external_id }, this.db),
    ]);

    return this.mapCollective(collectiveRow, membersResult, rolesResult);
  }

  /**
   * Create a new collective
   */
  async createCollective(userExternalId: string, input: CollectiveInput): Promise<Collective> {
    const results = await createCollective.run(
      {
        userExternalId,
        typeExternalId: input.collective_type_id,
        name: input.name,
        photoUrl: input.photo_url ?? null,
        photoThumbnailUrl: input.photo_thumbnail_url ?? null,
        notes: input.notes ?? null,
        addressStreetLine1: input.address_street_line1 ?? null,
        addressStreetLine2: input.address_street_line2 ?? null,
        addressCity: input.address_city ?? null,
        addressStateProvince: input.address_state_province ?? null,
        addressPostalCode: input.address_postal_code ?? null,
        addressCountry: input.address_country ?? null,
      },
      this.db,
    );

    if (results.length === 0) {
      throw new CollectiveCreationError('Failed to create collective');
    }

    // Fetch the full collective with type info
    const collective = await this.getCollectiveById(userExternalId, results[0].external_id);
    if (!collective) {
      throw new CollectiveCreationError('Failed to retrieve created collective');
    }

    return collective;
  }

  /**
   * Update an existing collective
   */
  async updateCollective(
    userExternalId: string,
    collectiveExternalId: string,
    input: CollectiveUpdate,
  ): Promise<Collective> {
    const results = await updateCollective.run(
      {
        userExternalId,
        collectiveExternalId,
        name: input.name ?? null,
        updatePhotoUrl: 'photo_url' in input,
        photoUrl: input.photo_url ?? null,
        updatePhotoThumbnailUrl: 'photo_thumbnail_url' in input,
        photoThumbnailUrl: input.photo_thumbnail_url ?? null,
        updateNotes: 'notes' in input,
        notes: input.notes ?? null,
        updateAddress:
          'address_street_line1' in input ||
          'address_street_line2' in input ||
          'address_city' in input ||
          'address_state_province' in input ||
          'address_postal_code' in input ||
          'address_country' in input,
        addressStreetLine1: input.address_street_line1 ?? null,
        addressStreetLine2: input.address_street_line2 ?? null,
        addressCity: input.address_city ?? null,
        addressStateProvince: input.address_state_province ?? null,
        addressPostalCode: input.address_postal_code ?? null,
        addressCountry: input.address_country ?? null,
      },
      this.db,
    );

    if (results.length === 0) {
      throw new CollectiveNotFoundError();
    }

    // Fetch the full collective
    const collective = await this.getCollectiveById(userExternalId, collectiveExternalId);
    if (!collective) {
      throw new CollectiveNotFoundError();
    }

    return collective;
  }

  /**
   * Soft delete a collective
   */
  async deleteCollective(userExternalId: string, collectiveExternalId: string): Promise<boolean> {
    const results = await deleteCollective.run({ userExternalId, collectiveExternalId }, this.db);
    return results.length > 0;
  }

  /**
   * Get all collectives a contact belongs to
   */
  async getCollectivesForContact(
    userExternalId: string,
    contactExternalId: string,
  ): Promise<ContactCollectiveSummary[]> {
    const results = await getCollectivesForContact.run(
      { userExternalId, contactExternalId },
      this.db,
    );

    return results.map((row) => this.mapContactCollectiveSummary(row));
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapCollective(
    row: IGetCollectiveByIdResult,
    members: IGetMembersByCollectiveIdResult[],
    roles: IGetRolesForTypeResult[],
  ): Collective {
    const type: CollectiveType = {
      id: row.type_external_id,
      name: row.type_name,
      description: row.type_description,
      isSystemDefault: row.type_is_system_default,
      roles: roles.map((r) => this.mapRole(r)),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };

    const address: CollectiveAddress = {
      streetLine1: row.address_street_line1,
      streetLine2: row.address_street_line2,
      city: row.address_city,
      stateProvince: row.address_state_province,
      postalCode: row.address_postal_code,
      country: row.address_country,
    };

    return {
      id: row.external_id,
      name: row.name,
      type,
      photoUrl: row.photo_url,
      photoThumbnailUrl: row.photo_thumbnail_url,
      notes: row.notes,
      address,
      memberCount: row.member_count ?? 0,
      activeMemberCount: row.active_member_count ?? 0,
      members: members.map((m) => this.mapMember(m)),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    };
  }

  private mapCollectiveListItem(
    row: IGetCollectivesByUserIdResult,
    memberPreview: IGetMemberPreviewBatchResult[],
  ): CollectiveListItem {
    return {
      id: row.external_id,
      name: row.name,
      type: {
        id: row.type_external_id,
        name: row.type_name,
      },
      photoUrl: row.photo_url,
      photoThumbnailUrl: row.photo_thumbnail_url,
      memberCount: row.member_count ?? 0,
      activeMemberCount: row.active_member_count ?? 0,
      memberPreview: memberPreview.map((m) => this.mapMemberContact(m)),
      createdAt: row.created_at.toISOString(),
      deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    };
  }

  private mapMember(row: IGetMembersByCollectiveIdResult): CollectiveMember {
    return {
      id: row.membership_external_id,
      contact: {
        id: row.contact_external_id,
        displayName: row.display_name ?? 'Unknown',
        photoUrl: row.photo_url,
      },
      role: {
        id: row.role_external_id,
        roleKey: row.role_key,
        label: row.role_label,
        sortOrder: row.role_sort_order,
      },
      isActive: row.is_active,
      inactiveReason: row.inactive_reason,
      inactiveDate: row.inactive_date ? this.formatDate(row.inactive_date) : null,
      joinedDate: row.joined_date ? this.formatDate(row.joined_date) : null,
      notes: row.notes,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapMemberContact(row: IGetMemberPreviewBatchResult): CollectiveMemberContact {
    return {
      id: row.external_id,
      displayName: row.display_name ?? 'Unknown',
      photoUrl: row.photo_url,
    };
  }

  private mapRole(row: IGetRolesForTypeResult): CollectiveRole {
    return {
      id: row.external_id,
      roleKey: row.role_key,
      label: row.label,
      sortOrder: row.sort_order,
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private mapContactCollectiveSummary(
    row: IGetCollectivesForContactResult,
  ): ContactCollectiveSummary {
    return {
      id: row.collective_external_id,
      name: row.collective_name,
      typeName: row.type_name,
      role: {
        id: row.role_external_id,
        roleKey: row.role_key,
        label: row.role_label,
        sortOrder: row.role_sort_order,
      },
      membershipId: row.membership_external_id,
      isActive: row.is_active,
    };
  }
}
