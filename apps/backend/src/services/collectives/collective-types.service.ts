import type {
  CollectiveRelationshipRule,
  CollectiveRole,
  CollectiveType,
  CollectiveTypeListResponse,
} from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import {
  getCollectiveTypeById,
  getCollectiveTypes,
  getRolesForType,
  getRulesForType,
  type IGetCollectiveTypesResult,
  type IGetRolesForTypeResult,
  type IGetRulesForTypeResult,
} from '../../models/queries/collectives.queries.js';

/**
 * Service for managing collective types (family, company, club, friend_group)
 */
export class CollectiveTypesService {
  constructor(private db: Pool) {}

  /**
   * List all collective types available to a user (system defaults + custom)
   */
  async listTypes(userExternalId: string): Promise<CollectiveTypeListResponse> {
    const typesResult = await getCollectiveTypes.run({ userExternalId }, this.db);

    // Fetch roles for each type in parallel
    const types = await Promise.all(
      typesResult.map(async (typeRow) => {
        const rolesResult = await getRolesForType.run(
          { typeExternalId: typeRow.external_id },
          this.db,
        );
        return this.mapCollectiveType(typeRow, rolesResult);
      }),
    );

    return { types };
  }

  /**
   * Get a single collective type with roles and rules
   */
  async getTypeById(
    userExternalId: string,
    typeExternalId: string,
  ): Promise<CollectiveType | null> {
    const typeResults = await getCollectiveTypeById.run(
      { userExternalId, typeExternalId },
      this.db,
    );

    if (typeResults.length === 0) {
      return null;
    }

    const typeRow = typeResults[0];

    // Fetch roles and rules in parallel
    const [rolesResult, rulesResult] = await Promise.all([
      getRolesForType.run({ typeExternalId }, this.db),
      getRulesForType.run({ typeExternalId }, this.db),
    ]);

    return this.mapCollectiveTypeWithRules(typeRow, rolesResult, rulesResult);
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapCollectiveType(
    row: IGetCollectiveTypesResult,
    roles: IGetRolesForTypeResult[],
  ): CollectiveType {
    return {
      id: row.external_id,
      name: row.name,
      description: row.description,
      isSystemDefault: row.is_system_default,
      roles: roles.map((r) => this.mapRole(r)),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapCollectiveTypeWithRules(
    row: IGetCollectiveTypesResult,
    roles: IGetRolesForTypeResult[],
    rules: IGetRulesForTypeResult[],
  ): CollectiveType {
    return {
      id: row.external_id,
      name: row.name,
      description: row.description,
      isSystemDefault: row.is_system_default,
      roles: roles.map((r) => this.mapRole(r)),
      rules: rules.map((r) => this.mapRule(r)),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
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

  private mapRule(row: IGetRulesForTypeResult): CollectiveRelationshipRule {
    return {
      newMemberRoleId: row.new_member_role_id,
      newMemberRoleKey: row.new_member_role_key,
      existingMemberRoleId: row.existing_member_role_id,
      existingMemberRoleKey: row.existing_member_role_key,
      relationshipTypeId: row.relationship_type_id,
      relationshipDirection: row.relationship_direction as
        | 'new_member'
        | 'existing_member'
        | 'both',
    };
  }
}
