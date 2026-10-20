import type {
  CollectiveAddressResponse,
  CollectiveListItemResponse,
  CollectiveListOptions,
  CollectiveListResponse,
  CollectiveMemberContactResponse,
  CollectiveResponse,
  CollectiveTypeResponse,
  ContactCollectiveSummaryResponse,
} from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import { CollectiveCreationError } from '../../errors/collective-creation.error.js';
import { CollectiveNotFoundError } from '../../errors/collective-not-found.error.js';
import { mapMember, mapRole } from '../../models/mappers/collectives.mappers.js';
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

const PREVIEW_MEMBER_LIMIT = 3;

/** Escape special ILIKE pattern characters to prevent wildcard injection */
function escapeIlike(input: string) {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export interface CollectivesServiceOptions {
  db: Pool;
}

export interface CollectiveCreateData {
  name: string;
  collectiveTypeId: string;
  notes?: string | null;
  photoUrl?: string | null;
  photoThumbnailUrl?: string | null;
  addressStreetLine1?: string | null;
  addressStreetLine2?: string | null;
  addressCity?: string | null;
  addressStateProvince?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
}

/** An absent key leaves the column untouched; `null` clears it. */
export interface CollectiveUpdateData {
  name?: string;
  notes?: string | null;
  photoUrl?: string | null;
  photoThumbnailUrl?: string | null;
  addressStreetLine1?: string | null;
  addressStreetLine2?: string | null;
  addressCity?: string | null;
  addressStateProvince?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
}

export class CollectivesService {
  private readonly db: Pool;

  constructor(options: CollectivesServiceOptions) {
    this.db = options.db;
  }

  //#region Collective CRUD

  public async listCollectives(userExternalId: string, options: CollectiveListOptions) {
    const offset = (options.page - 1) * options.pageSize;
    const escapedSearch =
      options.search === undefined || options.search === '' ? null : escapeIlike(options.search);

    const [collectivesResult, countResult] = await Promise.all([
      getCollectivesByUserId.run(
        {
          userExternalId,
          includeDeleted: options.shouldIncludeDeleted ?? false,
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
          includeDeleted: options.shouldIncludeDeleted ?? false,
          typeExternalId: options.typeId ?? null,
          search: escapedSearch,
        },
        this.db,
      ),
    ]);

    const totalCount = countResult[0]?.total_count ?? 0;

    const collectiveIds = collectivesResult.map((row) => row.external_id);
    const allPreviews =
      collectiveIds.length > 0
        ? await getMemberPreviewBatch.run(
            {
              userExternalId,
              collectiveExternalIds: collectiveIds,
              limit: PREVIEW_MEMBER_LIMIT,
            },
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

    const data = collectivesResult.map((row) =>
      this.mapCollectiveListItem(row, previewsByCollective.get(row.external_id) ?? []),
    );

    return {
      data,
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / options.pageSize),
      },
    } satisfies CollectiveListResponse;
  }

  public async findCollective(userExternalId: string, collectiveExternalId: string) {
    const results = await getCollectiveById.run({ userExternalId, collectiveExternalId }, this.db);

    const [collectiveRow] = results;
    if (collectiveRow === undefined) {
      return undefined;
    }

    const [membersResult, rolesResult] = await Promise.all([
      getMembersByCollectiveId.run(
        { userExternalId, collectiveExternalId, includeInactive: true },
        this.db,
      ),
      getRolesForType.run(
        { typeExternalId: collectiveRow.type_external_id, userExternalId },
        this.db,
      ),
    ]);

    return this.mapCollective(collectiveRow, membersResult, rolesResult);
  }

  public async getCollective(userExternalId: string, collectiveExternalId: string) {
    const collective = await this.findCollective(userExternalId, collectiveExternalId);
    if (collective === undefined) {
      throw new CollectiveNotFoundError(collectiveExternalId);
    }
    return collective;
  }

  public async createCollective(userExternalId: string, data: CollectiveCreateData) {
    const results = await createCollective.run(
      {
        userExternalId,
        typeExternalId: data.collectiveTypeId,
        name: data.name,
        photoUrl: data.photoUrl ?? null,
        photoThumbnailUrl: data.photoThumbnailUrl ?? null,
        notes: data.notes ?? null,
        addressStreetLine1: data.addressStreetLine1 ?? null,
        addressStreetLine2: data.addressStreetLine2 ?? null,
        addressCity: data.addressCity ?? null,
        addressStateProvince: data.addressStateProvince ?? null,
        addressPostalCode: data.addressPostalCode ?? null,
        addressCountry: data.addressCountry ?? null,
      },
      this.db,
    );

    const [created] = results;
    if (created === undefined) {
      throw new CollectiveCreationError('Failed to create collective');
    }

    const collective = await this.findCollective(userExternalId, created.external_id);
    if (collective === undefined) {
      throw new CollectiveCreationError('Failed to retrieve created collective');
    }

    return collective;
  }

  public async updateCollective(
    userExternalId: string,
    collectiveExternalId: string,
    data: CollectiveUpdateData,
  ) {
    const results = await updateCollective.run(
      {
        userExternalId,
        collectiveExternalId,
        name: data.name ?? null,
        updatePhotoUrl: 'photoUrl' in data,
        photoUrl: data.photoUrl ?? null,
        updatePhotoThumbnailUrl: 'photoThumbnailUrl' in data,
        photoThumbnailUrl: data.photoThumbnailUrl ?? null,
        updateNotes: 'notes' in data,
        notes: data.notes ?? null,
        updateAddress:
          'addressStreetLine1' in data ||
          'addressStreetLine2' in data ||
          'addressCity' in data ||
          'addressStateProvince' in data ||
          'addressPostalCode' in data ||
          'addressCountry' in data,
        addressStreetLine1: data.addressStreetLine1 ?? null,
        addressStreetLine2: data.addressStreetLine2 ?? null,
        addressCity: data.addressCity ?? null,
        addressStateProvince: data.addressStateProvince ?? null,
        addressPostalCode: data.addressPostalCode ?? null,
        addressCountry: data.addressCountry ?? null,
      },
      this.db,
    );

    if (results.length === 0) {
      throw new CollectiveNotFoundError(collectiveExternalId);
    }

    return this.getCollective(userExternalId, collectiveExternalId);
  }

  /**
   * Soft delete a collective; throws when it does not exist
   */
  public async deleteCollective(userExternalId: string, collectiveExternalId: string) {
    const results = await deleteCollective.run({ userExternalId, collectiveExternalId }, this.db);
    if (results.length === 0) {
      throw new CollectiveNotFoundError(collectiveExternalId);
    }
  }

  public async getCollectivesForContact(userExternalId: string, contactExternalId: string) {
    const results = await getCollectivesForContact.run(
      { userExternalId, contactExternalId },
      this.db,
    );

    return results.map((row) => this.mapContactCollectiveSummary(row));
  }

  //#endregion

  //#region Mappers

  private mapCollective(
    row: IGetCollectiveByIdResult,
    members: IGetMembersByCollectiveIdResult[],
    roles: IGetRolesForTypeResult[],
  ) {
    const type: CollectiveTypeResponse = {
      id: row.type_external_id,
      name: row.type_name,
      description: row.type_description,
      isSystemDefault: row.type_is_system_default,
      roles: roles.map((r) => mapRole(r)),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };

    const address: CollectiveAddressResponse = {
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
      members: members.map((m) => mapMember(m)),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      deletedAt: row.deleted_at === null ? null : row.deleted_at.toISOString(),
    } satisfies CollectiveResponse;
  }

  private mapCollectiveListItem(
    row: IGetCollectivesByUserIdResult,
    memberPreview: IGetMemberPreviewBatchResult[],
  ) {
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
      deletedAt: row.deleted_at === null ? null : row.deleted_at.toISOString(),
    } satisfies CollectiveListItemResponse;
  }

  private mapMemberContact(row: IGetMemberPreviewBatchResult) {
    return {
      id: row.external_id,
      displayName: row.display_name ?? 'Unknown',
      photoUrl: row.photo_url,
    } satisfies CollectiveMemberContactResponse;
  }

  private mapContactCollectiveSummary(row: IGetCollectivesForContactResult) {
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
    } satisfies ContactCollectiveSummaryResponse;
  }

  //#endregion
}
