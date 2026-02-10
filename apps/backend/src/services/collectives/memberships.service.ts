import type {
  CollectiveMember,
  CollectiveMemberContact,
  CollectiveRole,
  MembershipDeactivate,
  MembershipInput,
  RelationshipPreviewItem,
  RelationshipPreviewRequest,
  RelationshipPreviewResponse,
} from '@freundebuch/shared/index.js';
import type { Pool, PoolClient } from 'pg';
import {
  addMembership,
  checkDuplicateActiveMembership,
  checkRelationshipExists,
  createRelationshipWithSource,
  deactivateMembership,
  deleteRelationshipsByMembershipId,
  getCollectiveInternalId,
  getCollectiveTypeIdForCollective,
  getContactInfo,
  getContactInternalId,
  getMembershipById,
  getOtherActiveMembers,
  getRelationshipTypeInfo,
  getRoleByExternalId,
  getRoleInternalId,
  getRulesForTypeInternal,
  type IGetMembershipByIdResult,
  type IGetRulesForTypeInternalResult,
  reactivateMembership,
  removeMembership,
  updateMembershipRole,
} from '../../models/queries/collectives.queries.js';
import {
  CollectiveNotFoundError,
  ContactNotFoundError,
  DuplicateMembershipError,
  MembershipCreationError,
  MembershipNotFoundError,
  RoleNotFoundError,
} from '../../utils/errors.js';

/**
 * Service for managing collective memberships and auto-relationships
 */
export class MembershipsService {
  constructor(private db: Pool) {}

  // ============================================================================
  // Membership Operations
  // ============================================================================

  /**
   * Add a member to a collective with auto-relationship creation
   */
  async addMember(
    userExternalId: string,
    collectiveExternalId: string,
    input: MembershipInput,
  ): Promise<CollectiveMember> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Check for duplicate active membership (inside transaction for consistency)
      const duplicateCheck = await checkDuplicateActiveMembership.run(
        { collectiveExternalId, contactExternalId: input.friend_id },
        client,
      );

      if (duplicateCheck[0]?.count && duplicateCheck[0].count > 0) {
        throw new DuplicateMembershipError();
      }

      // Get internal IDs
      const [collectiveResult, contactResult, roleResult] = await Promise.all([
        getCollectiveInternalId.run({ userExternalId, collectiveExternalId }, client),
        getContactInternalId.run({ userExternalId, contactExternalId: input.friend_id }, client),
        getRoleInternalId.run({ collectiveExternalId, roleExternalId: input.role_id }, client),
      ]);

      if (collectiveResult.length === 0) {
        throw new CollectiveNotFoundError();
      }
      if (contactResult.length === 0) {
        throw new ContactNotFoundError();
      }
      if (roleResult.length === 0) {
        throw new RoleNotFoundError();
      }

      const collectiveId = collectiveResult[0].id;
      const contactId = contactResult[0].id;
      const roleId = roleResult[0].id;

      // Create the membership
      const membershipResult = await addMembership.run(
        {
          collectiveId,
          contactId,
          roleId,
          joinedDate: input.joined_date ?? null,
          notes: input.notes ?? null,
        },
        client,
      );

      if (membershipResult.length === 0) {
        throw new MembershipCreationError();
      }

      const membershipId = membershipResult[0].id;
      const membershipExternalId = membershipResult[0].external_id;

      // Create auto-relationships unless skipped
      if (!input.skip_auto_relationships) {
        await this.createAutoRelationships(client, collectiveId, contactId, roleId, membershipId);
      }

      await client.query('COMMIT');

      // Fetch and return the full membership
      const membership = await getMembershipById.run(
        { userExternalId, collectiveExternalId, membershipExternalId },
        this.db,
      );

      if (membership.length === 0) {
        throw new MembershipCreationError('Failed to retrieve created membership');
      }

      return this.mapMember(membership[0]);
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors to preserve the original error
      }
      throw error;
    } finally {
      try {
        client.release();
      } catch {
        // Prevent connection leak from masking the original error
      }
    }
  }

  /**
   * Get a membership by ID
   */
  async getMemberById(
    userExternalId: string,
    collectiveExternalId: string,
    membershipExternalId: string,
  ): Promise<CollectiveMember | null> {
    const results = await getMembershipById.run(
      { userExternalId, collectiveExternalId, membershipExternalId },
      this.db,
    );

    if (results.length === 0) {
      return null;
    }

    return this.mapMember(results[0]);
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    userExternalId: string,
    collectiveExternalId: string,
    membershipExternalId: string,
    roleExternalId: string,
  ): Promise<CollectiveMember> {
    const roleResult = await getRoleInternalId.run(
      { collectiveExternalId, roleExternalId },
      this.db,
    );

    if (roleResult.length === 0) {
      throw new RoleNotFoundError();
    }

    const results = await updateMembershipRole.run(
      {
        userExternalId,
        collectiveExternalId,
        membershipExternalId,
        roleId: roleResult[0].id,
      },
      this.db,
    );

    if (results.length === 0) {
      throw new MembershipNotFoundError();
    }

    const membership = await getMembershipById.run(
      { userExternalId, collectiveExternalId, membershipExternalId },
      this.db,
    );

    if (membership.length === 0) {
      throw new MembershipNotFoundError();
    }

    return this.mapMember(membership[0]);
  }

  /**
   * Deactivate a membership
   */
  async deactivateMember(
    userExternalId: string,
    collectiveExternalId: string,
    membershipExternalId: string,
    input: MembershipDeactivate,
  ): Promise<CollectiveMember> {
    const results = await deactivateMembership.run(
      {
        userExternalId,
        collectiveExternalId,
        membershipExternalId,
        inactiveReason: input.reason ?? null,
        inactiveDate: input.inactive_date ?? null,
      },
      this.db,
    );

    if (results.length === 0) {
      throw new MembershipNotFoundError();
    }

    const membership = await getMembershipById.run(
      { userExternalId, collectiveExternalId, membershipExternalId },
      this.db,
    );

    if (membership.length === 0) {
      throw new MembershipNotFoundError();
    }

    return this.mapMember(membership[0]);
  }

  /**
   * Reactivate a membership
   */
  async reactivateMember(
    userExternalId: string,
    collectiveExternalId: string,
    membershipExternalId: string,
  ): Promise<CollectiveMember> {
    const results = await reactivateMembership.run(
      { userExternalId, collectiveExternalId, membershipExternalId },
      this.db,
    );

    if (results.length === 0) {
      throw new MembershipNotFoundError();
    }

    const membership = await getMembershipById.run(
      { userExternalId, collectiveExternalId, membershipExternalId },
      this.db,
    );

    if (membership.length === 0) {
      throw new MembershipNotFoundError();
    }

    return this.mapMember(membership[0]);
  }

  /**
   * Remove a membership and its associated relationships
   */
  async removeMember(
    userExternalId: string,
    collectiveExternalId: string,
    membershipExternalId: string,
  ): Promise<boolean> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Get the membership internal ID first
      const membershipResult = await getMembershipById.run(
        { userExternalId, collectiveExternalId, membershipExternalId },
        client,
      );

      if (membershipResult.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const membershipId = membershipResult[0].id;

      // Delete relationships created by this membership
      await deleteRelationshipsByMembershipId.run({ membershipId }, client);

      // Delete the membership
      const deleteResult = await removeMembership.run(
        { userExternalId, collectiveExternalId, membershipExternalId },
        client,
      );

      await client.query('COMMIT');
      return deleteResult.length > 0;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors to preserve the original error
      }
      throw error;
    } finally {
      try {
        client.release();
      } catch {
        // Prevent connection leak from masking the original error
      }
    }
  }

  // ============================================================================
  // Relationship Preview
  // ============================================================================

  /**
   * Preview relationships that would be created when adding a member
   */
  async previewRelationships(
    userExternalId: string,
    collectiveExternalId: string,
    input: RelationshipPreviewRequest,
  ): Promise<RelationshipPreviewResponse> {
    // Check if the contact is already an active member
    const duplicateCheck = await checkDuplicateActiveMembership.run(
      { collectiveExternalId, contactExternalId: input.friend_id },
      this.db,
    );

    if (duplicateCheck[0]?.count && duplicateCheck[0].count > 0) {
      throw new DuplicateMembershipError();
    }

    // Get contact info
    const contactResult = await getContactInfo.run(
      { userExternalId, contactExternalId: input.friend_id },
      this.db,
    );

    if (contactResult.length === 0) {
      throw new ContactNotFoundError();
    }

    const newContact: CollectiveMemberContact = {
      id: contactResult[0].external_id,
      displayName: contactResult[0].display_name ?? 'Unknown',
      photoUrl: contactResult[0].photo_url,
    };

    // Get collective internal ID
    const collectiveResult = await getCollectiveInternalId.run(
      { userExternalId, collectiveExternalId },
      this.db,
    );

    if (collectiveResult.length === 0) {
      throw new CollectiveNotFoundError();
    }

    const collectiveId = collectiveResult[0].id;

    // Get collective type ID
    const typeResult = await getCollectiveTypeIdForCollective.run({ collectiveId }, this.db);
    if (typeResult.length === 0) {
      throw new CollectiveNotFoundError();
    }

    const collectiveTypeId = typeResult[0].collective_type_id;

    // Get role info
    const roleResult = await getRoleInternalId.run(
      { collectiveExternalId, roleExternalId: input.role_id },
      this.db,
    );

    if (roleResult.length === 0) {
      throw new RoleNotFoundError();
    }

    const newMemberRoleId = roleResult[0].id;

    // Get rules for this collective type
    const rules = await getRulesForTypeInternal.run({ collectiveTypeId }, this.db);

    // Get other active members
    const otherMembers = await getOtherActiveMembers.run(
      { collectiveId, excludeContactId: contactResult[0].id },
      this.db,
    );

    // Pre-fetch all relationship type info concurrently to avoid sequential queries
    const uniqueTypeIds = [...new Set(rules.map((r) => r.relationship_type_id))];
    const typeInfoMap = new Map<
      string,
      { id: string; label: string; category: string; inverse_type_id: string | null }
    >();

    const typeInfoResults = await Promise.all(
      uniqueTypeIds.map((typeId) =>
        getRelationshipTypeInfo.run({ relationshipTypeId: typeId }, this.db),
      ),
    );

    for (let i = 0; i < uniqueTypeIds.length; i++) {
      const info = typeInfoResults[i];
      if (info.length > 0) {
        typeInfoMap.set(uniqueTypeIds[i], info[0]);
      }
    }

    // Fetch any missing inverse types concurrently
    const missingInverseIds = [...typeInfoMap.values()]
      .filter((info) => info.inverse_type_id && !typeInfoMap.has(info.inverse_type_id))
      .map((info) => info.inverse_type_id!);

    if (missingInverseIds.length > 0) {
      const inverseResults = await Promise.all(
        missingInverseIds.map((typeId) =>
          getRelationshipTypeInfo.run({ relationshipTypeId: typeId }, this.db),
        ),
      );

      for (let i = 0; i < missingInverseIds.length; i++) {
        const info = inverseResults[i];
        if (info.length > 0) {
          typeInfoMap.set(missingInverseIds[i], info[0]);
        }
      }
    }

    // Calculate relationships that would be created
    const relationships: RelationshipPreviewItem[] = [];
    let existingRelationshipsSkipped = 0;

    for (const existingMember of otherMembers) {
      // Find matching rules
      const matchingRules = rules.filter(
        (rule) =>
          rule.new_member_role_id === newMemberRoleId &&
          rule.existing_member_role_id === existingMember.role_id,
      );

      for (const rule of matchingRules) {
        const typeInfo = typeInfoMap.get(rule.relationship_type_id);
        if (!typeInfo) continue;

        // Determine relationships based on direction
        if (
          rule.relationship_direction === 'new_member' ||
          rule.relationship_direction === 'both'
        ) {
          const exists = await this.checkRelationshipExists(
            contactResult[0].id,
            existingMember.contact_id,
            rule.relationship_type_id,
          );

          relationships.push({
            fromContact: newContact,
            toContact: {
              id: existingMember.contact_external_id,
              displayName: existingMember.display_name ?? 'Unknown',
              photoUrl: existingMember.photo_url,
            },
            relationshipType: {
              id: typeInfo.id,
              label: typeInfo.label,
              category: typeInfo.category,
            },
            alreadyExists: exists,
          });

          if (exists) existingRelationshipsSkipped++;
        }

        if (
          rule.relationship_direction === 'existing_member' ||
          rule.relationship_direction === 'both'
        ) {
          const exists = await this.checkRelationshipExists(
            existingMember.contact_id,
            contactResult[0].id,
            rule.relationship_type_id,
          );

          // For 'both' direction with symmetric relationships, show inverse
          const inverseTypeId = typeInfo.inverse_type_id ?? rule.relationship_type_id;
          const inverseTypeInfo = typeInfoMap.get(inverseTypeId) ?? typeInfo;

          relationships.push({
            fromContact: {
              id: existingMember.contact_external_id,
              displayName: existingMember.display_name ?? 'Unknown',
              photoUrl: existingMember.photo_url,
            },
            toContact: newContact,
            relationshipType: {
              id: inverseTypeInfo.id,
              label: inverseTypeInfo.label,
              category: inverseTypeInfo.category,
            },
            alreadyExists: exists,
          });

          if (exists) existingRelationshipsSkipped++;
        }
      }
    }

    // We need to fetch role info - get from collective
    const roleInfo = await this.getRoleInfo(collectiveExternalId, input.role_id);

    return {
      newContact,
      role: roleInfo,
      relationships,
      existingRelationshipsSkipped,
    };
  }

  // ============================================================================
  // Auto-Relationship Logic
  // ============================================================================

  /**
   * Create automatic relationships based on collective type rules
   */
  private async createAutoRelationships(
    client: PoolClient,
    collectiveId: number,
    newContactId: number,
    newMemberRoleId: number,
    membershipId: number,
  ): Promise<void> {
    // Get collective type ID
    const typeResult = await getCollectiveTypeIdForCollective.run({ collectiveId }, client);
    if (typeResult.length === 0) {
      return;
    }

    const collectiveTypeId = typeResult[0].collective_type_id;

    // Get rules for this collective type
    const rules = await getRulesForTypeInternal.run({ collectiveTypeId }, client);

    // Get other active members
    const otherMembers = await getOtherActiveMembers.run(
      { collectiveId, excludeContactId: newContactId },
      client,
    );

    // Create relationships based on rules
    for (const existingMember of otherMembers) {
      // Find matching rules where new member's role matches and existing member's role matches
      const matchingRules = rules.filter(
        (rule) =>
          rule.new_member_role_id === newMemberRoleId &&
          rule.existing_member_role_id === existingMember.role_id,
      );

      for (const rule of matchingRules) {
        await this.createRelationshipsForRule(
          client,
          rule,
          newContactId,
          existingMember.contact_id,
          membershipId,
        );
      }
    }
  }

  /**
   * Create relationships based on a single rule
   */
  private async createRelationshipsForRule(
    client: PoolClient,
    rule: IGetRulesForTypeInternalResult,
    newContactId: number,
    existingContactId: number,
    membershipId: number,
  ): Promise<void> {
    const direction = rule.relationship_direction as 'new_member' | 'existing_member' | 'both';

    if (direction === 'new_member' || direction === 'both') {
      // Skip if the inverse relationship already exists (prevents circular chains)
      const inverseExists = await checkRelationshipExists.run(
        {
          fromFriendId: existingContactId,
          toFriendId: newContactId,
          relationshipTypeId: rule.relationship_type_id,
        },
        client,
      );

      if ((inverseExists[0]?.count ?? 0) === 0) {
        // New member is the "from" friend
        await createRelationshipWithSource.run(
          {
            fromFriendId: newContactId,
            toFriendId: existingContactId,
            relationshipTypeId: rule.relationship_type_id,
            sourceMembershipId: membershipId,
          },
          client,
        );
      }
    }

    if (direction === 'existing_member' || direction === 'both') {
      // Existing member is the "from" friend - use inverse relationship type
      const typeInfo = await getRelationshipTypeInfo.run(
        { relationshipTypeId: rule.relationship_type_id },
        client,
      );

      const inverseTypeId = typeInfo[0]?.inverse_type_id ?? rule.relationship_type_id;

      // Skip if the inverse relationship already exists (prevents circular chains)
      const inverseExists = await checkRelationshipExists.run(
        {
          fromFriendId: newContactId,
          toFriendId: existingContactId,
          relationshipTypeId: inverseTypeId,
        },
        client,
      );

      if ((inverseExists[0]?.count ?? 0) === 0) {
        await createRelationshipWithSource.run(
          {
            fromFriendId: existingContactId,
            toFriendId: newContactId,
            relationshipTypeId: inverseTypeId,
            sourceMembershipId: membershipId,
          },
          client,
        );
      }
    }
  }

  /**
   * Check if a relationship already exists
   */
  private async checkRelationshipExists(
    fromFriendId: number,
    toFriendId: number,
    relationshipTypeId: string,
  ): Promise<boolean> {
    const result = await checkRelationshipExists.run(
      { fromFriendId, toFriendId, relationshipTypeId },
      this.db,
    );
    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Get role info for preview response
   */
  private async getRoleInfo(
    collectiveExternalId: string,
    roleExternalId: string,
  ): Promise<CollectiveRole> {
    const result = await getRoleByExternalId.run({ collectiveExternalId, roleExternalId }, this.db);

    if (result.length === 0) {
      throw new RoleNotFoundError();
    }

    return {
      id: result[0].external_id,
      roleKey: result[0].role_key,
      label: result[0].label,
      sortOrder: result[0].sort_order,
    };
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapMember(row: IGetMembershipByIdResult): CollectiveMember {
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

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
