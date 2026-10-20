import type {
  CollectiveRelationshipRuleResponse,
  CollectiveTypeListResponse,
  CollectiveTypeResponse,
} from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error.js';
import { mapRole } from '../../models/mappers/collectives.mappers.js';
import {
  getCollectiveTypeById,
  getCollectiveTypes,
  getRolesForType,
  getRulesForType,
  type IGetCollectiveTypesResult,
  type IGetRolesForTypeResult,
  type IGetRulesForTypeResult,
} from '../../models/queries/collectives.queries.js';
import { parseRelationshipDirection } from '../../utils/parse-relationship-direction.js';

export interface CollectiveTypesServiceOptions {
  db: Pool;
}

export class CollectiveTypesService {
  private readonly db: Pool;

  constructor(options: CollectiveTypesServiceOptions) {
    this.db = options.db;
  }

  public async listTypes(userExternalId: string) {
    const typesResult = await getCollectiveTypes.run({ userExternalId }, this.db);
    const types = await Promise.all(
      typesResult.map((typeRow) => this.loadTypeWithRoles(userExternalId, typeRow)),
    );
    return { types } satisfies CollectiveTypeListResponse;
  }

  private async loadTypeWithRoles(userExternalId: string, typeRow: IGetCollectiveTypesResult) {
    const rolesResult = await getRolesForType.run(
      { typeExternalId: typeRow.external_id, userExternalId },
      this.db,
    );
    return this.mapCollectiveType(typeRow, rolesResult);
  }

  public async getType(userExternalId: string, typeExternalId: string) {
    const typeResults = await getCollectiveTypeById.run(
      { userExternalId, typeExternalId },
      this.db,
    );

    const [typeRow] = typeResults;
    if (typeRow === undefined) {
      throw new ResourceNotFoundError('Collective type', typeExternalId);
    }

    const [rolesResult, rulesResult] = await Promise.all([
      getRolesForType.run({ typeExternalId, userExternalId }, this.db),
      getRulesForType.run({ typeExternalId, userExternalId }, this.db),
    ]);

    return this.mapCollectiveTypeWithRules(typeRow, rolesResult, rulesResult);
  }

  //#region Mappers

  private mapCollectiveType(row: IGetCollectiveTypesResult, roles: IGetRolesForTypeResult[]) {
    return {
      id: row.external_id,
      name: row.name,
      description: row.description,
      isSystemDefault: row.is_system_default,
      roles: roles.map((r) => mapRole(r)),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    } satisfies CollectiveTypeResponse;
  }

  private mapCollectiveTypeWithRules(
    row: IGetCollectiveTypesResult,
    roles: IGetRolesForTypeResult[],
    rules: IGetRulesForTypeResult[],
  ) {
    return {
      id: row.external_id,
      name: row.name,
      description: row.description,
      isSystemDefault: row.is_system_default,
      roles: roles.map((r) => mapRole(r)),
      rules: rules.map((r) => this.mapRule(r)),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    } satisfies CollectiveTypeResponse;
  }

  private mapRule(row: IGetRulesForTypeResult) {
    return {
      newMemberRoleId: row.new_member_role_id,
      newMemberRoleKey: row.new_member_role_key,
      existingMemberRoleId: row.existing_member_role_id,
      existingMemberRoleKey: row.existing_member_role_key,
      relationshipTypeId: row.relationship_type_id,
      relationshipDirection: parseRelationshipDirection(row.relationship_direction),
    } satisfies CollectiveRelationshipRuleResponse;
  }

  //#endregion
}
