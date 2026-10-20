import type {
  CollectiveMemberContactResponse,
  CollectiveMemberResponse,
  CollectiveRoleResponse,
  MembershipCreateInput,
  MembershipDeactivateInput,
  RelationshipPreviewInput,
  RelationshipPreviewItemResponse,
  RelationshipPreviewResponse,
} from '@freundebuch/shared/index.js';
import type { Pool, PoolClient } from 'pg';
import { mapMember } from '../../models/mappers/collectives.mappers.js';
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
  type IGetRulesForTypeInternalResult,
  reactivateMembership,
  removeMembership,
  updateMembershipRole,
} from '../../models/queries/collectives.queries.js';
import {
  CollectiveNotFoundError,
  DuplicateMembershipError,
  FriendNotFoundError,
  MembershipCreationError,
  MembershipNotFoundError,
  RoleNotFoundError,
} from '../../utils/errors.js';
import { parseRelationshipDirection } from '../../utils/type-guards.js';

export interface MembershipsServiceOptions {
  db: Pool;
}

/**
 * Service for managing collective memberships and auto-relationships
 */
export class MembershipsService {
  private db: Pool;

  constructor(options: MembershipsServiceOptions) {
    this.db = options.db;
  }

  // ============================================================================
  // Membership Operations
  // ============================================================================

  /**
   * Add a member to a collective with auto-relationship creation
   */
  async addMember(
    userExternalId: string,
    collectiveExternalId: string,
    input: MembershipCreateInput,
  ): Promise<CollectiveMemberResponse> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Check for duplicate active membership (inside transaction for consistency)
      const duplicateCheck = await checkDuplicateActiveMembership.run(
        { userExternalId, collectiveExternalId, contactExternalId: input.friend_id },
        client,
      );

      if (duplicateCheck[0]?.count && duplicateCheck[0].count > 0) {
        throw new DuplicateMembershipError();
      }

      // Get internal IDs
      const [collectiveResult, contactResult, roleResult] = await Promise.all([
        getCollectiveInternalId.run({ userExternalId, collectiveExternalId }, client),
        getContactInternalId.run({ userExternalId, contactExternalId: input.friend_id }, client),
        getRoleInternalId.run(
          { userExternalId, collectiveExternalId, roleExternalId: input.role_id },
          client,
        ),
      ]);

      const [collective] = collectiveResult;
      if (collective === undefined) {
        throw new CollectiveNotFoundError();
      }
      const [contact] = contactResult;
      if (contact === undefined) {
        throw new FriendNotFoundError();
      }
      const [role] = roleResult;
      if (role === undefined) {
        throw new RoleNotFoundError();
      }

      const collectiveId = collective.id;
      const contactId = contact.id;
      const roleId = role.id;

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

      const [createdMembership] = membershipResult;
      if (createdMembership === undefined) {
        throw new MembershipCreationError();
      }

      const membershipId = createdMembership.id;
      const membershipExternalId = createdMembership.external_id;

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

      const [membershipRow] = membership;
      if (membershipRow === undefined) {
        throw new MembershipCreationError('Failed to retrieve created membership');
      }

      return mapMember(membershipRow);
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
  ): Promise<CollectiveMemberResponse | null> {
    const results = await getMembershipById.run(
      { userExternalId, collectiveExternalId, membershipExternalId },
      this.db,
    );

    const [row] = results;
    if (row === undefined) {
      return null;
    }

    return mapMember(row);
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    userExternalId: string,
    collectiveExternalId: string,
    membershipExternalId: string,
    roleExternalId: string,
  ): Promise<CollectiveMemberResponse> {
    const roleResult = await getRoleInternalId.run(
      { userExternalId, collectiveExternalId, roleExternalId },
      this.db,
    );

    const [role] = roleResult;
    if (role === undefined) {
      throw new RoleNotFoundError();
    }

    const results = await updateMembershipRole.run(
      {
        userExternalId,
        collectiveExternalId,
        membershipExternalId,
        roleId: role.id,
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

    const [membershipRow] = membership;
    if (membershipRow === undefined) {
      throw new MembershipNotFoundError();
    }

    return mapMember(membershipRow);
  }

  /**
   * Deactivate a membership
   */
  async deactivateMember(
    userExternalId: string,
    collectiveExternalId: string,
    membershipExternalId: string,
    input: MembershipDeactivateInput,
  ): Promise<CollectiveMemberResponse> {
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

    const [membershipRow] = membership;
    if (membershipRow === undefined) {
      throw new MembershipNotFoundError();
    }

    return mapMember(membershipRow);
  }

  /**
   * Reactivate a membership
   */
  async reactivateMember(
    userExternalId: string,
    collectiveExternalId: string,
    membershipExternalId: string,
  ): Promise<CollectiveMemberResponse> {
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

    const [membershipRow] = membership;
    if (membershipRow === undefined) {
      throw new MembershipNotFoundError();
    }

    return mapMember(membershipRow);
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

      const [membershipRow] = membershipResult;
      if (membershipRow === undefined) {
        await client.query('ROLLBACK');
        return false;
      }

      const membershipId = membershipRow.id;

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
    input: RelationshipPreviewInput,
  ): Promise<RelationshipPreviewResponse> {
    // Check if the contact is already an active member
    const duplicateCheck = await checkDuplicateActiveMembership.run(
      { userExternalId, collectiveExternalId, contactExternalId: input.friend_id },
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

    const [contact] = contactResult;
    if (contact === undefined) {
      throw new FriendNotFoundError();
    }

    const newContact: CollectiveMemberContactResponse = {
      id: contact.external_id,
      displayName: contact.display_name ?? 'Unknown',
      photoUrl: contact.photo_url,
    };

    // Get collective internal ID
    const collectiveResult = await getCollectiveInternalId.run(
      { userExternalId, collectiveExternalId },
      this.db,
    );

    const [collective] = collectiveResult;
    if (collective === undefined) {
      throw new CollectiveNotFoundError();
    }

    const collectiveId = collective.id;

    // Get collective type ID
    const typeResult = await getCollectiveTypeIdForCollective.run({ collectiveId }, this.db);
    const [typeRow] = typeResult;
    if (typeRow === undefined) {
      throw new CollectiveNotFoundError();
    }

    const collectiveTypeId = typeRow.collective_type_id;

    // Get role info
    const roleResult = await getRoleInternalId.run(
      { userExternalId, collectiveExternalId, roleExternalId: input.role_id },
      this.db,
    );

    const [role] = roleResult;
    if (role === undefined) {
      throw new RoleNotFoundError();
    }

    const newMemberRoleId = role.id;

    // Get rules for this collective type
    const rules = await getRulesForTypeInternal.run({ collectiveTypeId }, this.db);

    // Get other active members
    const otherMembers = await getOtherActiveMembers.run(
      { collectiveId, excludeContactId: contact.id },
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

    for (const [i, typeId] of uniqueTypeIds.entries()) {
      const info = typeInfoResults[i]?.[0];
      if (info !== undefined) {
        typeInfoMap.set(typeId, info);
      }
    }

    // Calculate relationships that would be created
    const relationships: RelationshipPreviewItemResponse[] = [];
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
            contact.id,
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
            contact.id,
            rule.relationship_type_id,
          );

          relationships.push({
            fromContact: {
              id: existingMember.contact_external_id,
              displayName: existingMember.display_name ?? 'Unknown',
              photoUrl: existingMember.photo_url,
            },
            toContact: newContact,
            relationshipType: {
              id: typeInfo.id,
              label: typeInfo.label,
              category: typeInfo.category,
            },
            alreadyExists: exists,
          });

          if (exists) existingRelationshipsSkipped++;
        }
      }
    }

    // We need to fetch role info - get from collective
    const roleInfo = await this.getRoleInfo(userExternalId, collectiveExternalId, input.role_id);

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
    const [typeRow] = typeResult;
    if (typeRow === undefined) {
      return;
    }

    const collectiveTypeId = typeRow.collective_type_id;

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
   * Create relationships based on a single rule.
   *
   * Relationships are stored as directed edges and a contact only sees edges
   * where it is the "from" friend. To make the relationship visible on both
   * contacts we always create the reciprocal edge using the relationship
   * type's inverse, mirroring the manual relationship flow
   * (RelationshipService.addRelationship). Without the inverse edge the
   * relationship only shows up on one of the two contacts.
   */
  private async createRelationshipsForRule(
    client: PoolClient,
    rule: IGetRulesForTypeInternalResult,
    newContactId: number,
    existingContactId: number,
    membershipId: number,
  ): Promise<void> {
    const direction = parseRelationshipDirection(rule.relationship_direction);

    // Look up the inverse type so we can create the reciprocal edge. Every
    // seeded relationship type defines an inverse (symmetric types point to
    // themselves), so this is expected to be present.
    const typeInfo = await getRelationshipTypeInfo.run(
      { relationshipTypeId: rule.relationship_type_id },
      client,
    );
    const inverseTypeId = typeInfo[0]?.inverse_type_id ?? null;

    // Determine which contact owns the primary edge. 'both' is only used for
    // symmetric types (sibling, spouse) whose inverse equals the type itself,
    // so a single primary + inverse pair yields the correct bidirectional
    // result without creating duplicate rows.
    const primaryFromId = direction === 'existing_member' ? existingContactId : newContactId;
    const primaryToId = direction === 'existing_member' ? newContactId : existingContactId;

    await this.createRelationshipPair(
      client,
      primaryFromId,
      primaryToId,
      rule.relationship_type_id,
      inverseTypeId,
      membershipId,
    );
  }

  /**
   * Create a directed relationship and its reciprocal edge so the relationship
   * is visible on both contacts. Both inserts use ON CONFLICT DO UPDATE, so
   * pre-existing edges are tolerated.
   */
  private async createRelationshipPair(
    client: PoolClient,
    fromContactId: number,
    toContactId: number,
    relationshipTypeId: string,
    inverseTypeId: string | null,
    membershipId: number,
  ): Promise<void> {
    await createRelationshipWithSource.run(
      {
        fromFriendId: fromContactId,
        toFriendId: toContactId,
        relationshipTypeId,
        sourceMembershipId: membershipId,
      },
      client,
    );

    if (inverseTypeId) {
      await createRelationshipWithSource.run(
        {
          fromFriendId: toContactId,
          toFriendId: fromContactId,
          relationshipTypeId: inverseTypeId,
          sourceMembershipId: membershipId,
        },
        client,
      );
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
    userExternalId: string,
    collectiveExternalId: string,
    roleExternalId: string,
  ): Promise<CollectiveRoleResponse> {
    const result = await getRoleByExternalId.run(
      { userExternalId, collectiveExternalId, roleExternalId },
      this.db,
    );

    const [role] = result;
    if (role === undefined) {
      throw new RoleNotFoundError();
    }

    return {
      id: role.external_id,
      roleKey: role.role_key,
      label: role.label,
      sortOrder: role.sort_order,
    };
  }

  // ============================================================================
  // Mappers
  // ============================================================================
}
