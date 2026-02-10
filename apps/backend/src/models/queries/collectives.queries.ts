/** Types generated for queries found in "src/models/queries/collectives.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'GetCollectiveTypes' parameters type */
export interface IGetCollectiveTypesParams {
  userExternalId?: string | null | void;
}

/** 'GetCollectiveTypes' return type */
export interface IGetCollectiveTypesResult {
  created_at: Date;
  /** Description of the collective type */
  description: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** True for system-provided types, false for user-created */
  is_system_default: boolean;
  /** Type name (e.g., Family, Company, Club) */
  name: string;
  updated_at: Date;
}

/** 'GetCollectiveTypes' query type */
export interface IGetCollectiveTypesQuery {
  params: IGetCollectiveTypesParams;
  result: IGetCollectiveTypesResult;
}

const getCollectiveTypesIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":342,"b":356}]}],"statement":"-- Get all collective types available to a user (system defaults + user's custom)\nSELECT\n    ct.external_id,\n    ct.name,\n    ct.description,\n    ct.is_system_default,\n    ct.created_at,\n    ct.updated_at\nFROM collectives.collective_types ct\nWHERE ct.is_system_default = TRUE\n   OR ct.user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId::uuid)\nORDER BY ct.is_system_default DESC, ct.name ASC"};

/**
 * Query generated from SQL:
 * ```
 * -- Get all collective types available to a user (system defaults + user's custom)
 * SELECT
 *     ct.external_id,
 *     ct.name,
 *     ct.description,
 *     ct.is_system_default,
 *     ct.created_at,
 *     ct.updated_at
 * FROM collectives.collective_types ct
 * WHERE ct.is_system_default = TRUE
 *    OR ct.user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId::uuid)
 * ORDER BY ct.is_system_default DESC, ct.name ASC
 * ```
 */
export const getCollectiveTypes = new PreparedQuery<IGetCollectiveTypesParams,IGetCollectiveTypesResult>(getCollectiveTypesIR);


/** 'GetCollectiveTypeById' parameters type */
export interface IGetCollectiveTypeByIdParams {
  typeExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCollectiveTypeById' return type */
export interface IGetCollectiveTypeByIdResult {
  created_at: Date;
  /** Description of the collective type */
  description: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** True for system-provided types, false for user-created */
  is_system_default: boolean;
  /** Type name (e.g., Family, Company, Club) */
  name: string;
  updated_at: Date;
}

/** 'GetCollectiveTypeById' query type */
export interface IGetCollectiveTypeByIdQuery {
  params: IGetCollectiveTypeByIdParams;
  result: IGetCollectiveTypeByIdResult;
}

const getCollectiveTypeByIdIR: any = {"usedParamSet":{"typeExternalId":true,"userExternalId":true},"params":[{"name":"typeExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":197}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":312,"b":326}]}],"statement":"SELECT\n    ct.external_id,\n    ct.name,\n    ct.description,\n    ct.is_system_default,\n    ct.created_at,\n    ct.updated_at\nFROM collectives.collective_types ct\nWHERE ct.external_id = :typeExternalId::uuid\n  AND (\n    ct.is_system_default = TRUE\n    OR ct.user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId::uuid)\n  )"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     ct.external_id,
 *     ct.name,
 *     ct.description,
 *     ct.is_system_default,
 *     ct.created_at,
 *     ct.updated_at
 * FROM collectives.collective_types ct
 * WHERE ct.external_id = :typeExternalId::uuid
 *   AND (
 *     ct.is_system_default = TRUE
 *     OR ct.user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId::uuid)
 *   )
 * ```
 */
export const getCollectiveTypeById = new PreparedQuery<IGetCollectiveTypeByIdParams,IGetCollectiveTypeByIdResult>(getCollectiveTypeByIdIR);


/** 'GetRolesForType' parameters type */
export interface IGetRolesForTypeParams {
  typeExternalId?: string | null | void;
}

/** 'GetRolesForType' return type */
export interface IGetRolesForTypeResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** Human-readable label for display */
  label: string;
  /** Role identifier (e.g., parent, child, employee) */
  role_key: string;
  /** Display order within the type */
  sort_order: number;
}

/** 'GetRolesForType' query type */
export interface IGetRolesForTypeQuery {
  params: IGetRolesForTypeParams;
  result: IGetRolesForTypeResult;
}

const getRolesForTypeIR: any = {"usedParamSet":{"typeExternalId":true},"params":[{"name":"typeExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":212,"b":226}]}],"statement":"SELECT\n    cr.external_id,\n    cr.role_key,\n    cr.label,\n    cr.sort_order\nFROM collectives.collective_roles cr\nINNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id\nWHERE ct.external_id = :typeExternalId::uuid\nORDER BY cr.sort_order ASC, cr.label ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     cr.external_id,
 *     cr.role_key,
 *     cr.label,
 *     cr.sort_order
 * FROM collectives.collective_roles cr
 * INNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id
 * WHERE ct.external_id = :typeExternalId::uuid
 * ORDER BY cr.sort_order ASC, cr.label ASC
 * ```
 */
export const getRolesForType = new PreparedQuery<IGetRolesForTypeParams,IGetRolesForTypeResult>(getRolesForTypeIR);


/** 'GetRulesForType' parameters type */
export interface IGetRulesForTypeParams {
  typeExternalId?: string | null | void;
}

/** 'GetRulesForType' return type */
export interface IGetRulesForTypeResult {
  /** Public UUID for API exposure */
  existing_member_role_id: string;
  /** Role identifier (e.g., parent, child, employee) */
  existing_member_role_key: string;
  /** Public UUID for API exposure */
  new_member_role_id: string;
  /** Role identifier (e.g., parent, child, employee) */
  new_member_role_key: string;
  /** Direction: new_member (new is from), existing_member (existing is from), both (bidirectional) */
  relationship_direction: string;
  /** ...create this relationship type */
  relationship_type_id: string;
}

/** 'GetRulesForType' query type */
export interface IGetRulesForTypeQuery {
  params: IGetRulesForTypeParams;
  result: IGetRulesForTypeResult;
}

const getRulesForTypeIR: any = {"usedParamSet":{"typeExternalId":true},"params":[{"name":"typeExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":552,"b":566}]}],"statement":"SELECT\n    nr.external_id AS new_member_role_id,\n    nr.role_key AS new_member_role_key,\n    er.external_id AS existing_member_role_id,\n    er.role_key AS existing_member_role_key,\n    crr.relationship_type_id,\n    crr.relationship_direction\nFROM collectives.collective_relationship_rules crr\nINNER JOIN collectives.collective_types ct ON crr.collective_type_id = ct.id\nINNER JOIN collectives.collective_roles nr ON crr.new_member_role_id = nr.id\nINNER JOIN collectives.collective_roles er ON crr.existing_member_role_id = er.id\nWHERE ct.external_id = :typeExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     nr.external_id AS new_member_role_id,
 *     nr.role_key AS new_member_role_key,
 *     er.external_id AS existing_member_role_id,
 *     er.role_key AS existing_member_role_key,
 *     crr.relationship_type_id,
 *     crr.relationship_direction
 * FROM collectives.collective_relationship_rules crr
 * INNER JOIN collectives.collective_types ct ON crr.collective_type_id = ct.id
 * INNER JOIN collectives.collective_roles nr ON crr.new_member_role_id = nr.id
 * INNER JOIN collectives.collective_roles er ON crr.existing_member_role_id = er.id
 * WHERE ct.external_id = :typeExternalId::uuid
 * ```
 */
export const getRulesForType = new PreparedQuery<IGetRulesForTypeParams,IGetRulesForTypeResult>(getRulesForTypeIR);


/** 'GetCollectivesByUserId' parameters type */
export interface IGetCollectivesByUserIdParams {
  includeDeleted?: boolean | null | void;
  offset?: NumberOrString | null | void;
  pageSize?: NumberOrString | null | void;
  search?: string | null | void;
  typeExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCollectivesByUserId' return type */
export interface IGetCollectivesByUserIdResult {
  active_member_count: number | null;
  created_at: Date;
  /** Soft delete timestamp - when set, collective is considered deleted */
  deleted_at: Date | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  member_count: number | null;
  /** Name of the collective (e.g., "The Smith Family", "Acme Corp") */
  name: string;
  /** URL to collective photo thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to collective photo */
  photo_url: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  type_external_id: string;
  /** Type name (e.g., Family, Company, Club) */
  type_name: string;
}

/** 'GetCollectivesByUserId' query type */
export interface IGetCollectivesByUserIdQuery {
  params: IGetCollectivesByUserIdParams;
  result: IGetCollectivesByUserIdResult;
}

const getCollectivesByUserIdIR: any = {"usedParamSet":{"userExternalId":true,"includeDeleted":true,"typeExternalId":true,"search":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":601,"b":615}]},{"name":"includeDeleted","required":false,"transform":{"type":"scalar"},"locs":[{"a":635,"b":649}]},{"name":"typeExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":711,"b":725},{"a":765,"b":779}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":803,"b":809},{"a":852,"b":858},{"a":895,"b":901}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":1085,"b":1093}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1102,"b":1108}]}],"statement":"SELECT\n    c.external_id,\n    c.name,\n    ct.external_id AS type_external_id,\n    ct.name AS type_name,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.deleted_at,\n    COUNT(DISTINCT cm.id) FILTER (WHERE cm.id IS NOT NULL)::int AS member_count,\n    COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_active = TRUE)::int AS active_member_count\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nINNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id\nLEFT JOIN collectives.collective_memberships cm ON cm.collective_id = c.id\nWHERE u.external_id = :userExternalId::uuid\n  AND (\n    :includeDeleted::boolean = TRUE\n    OR c.deleted_at IS NULL\n  )\n  AND (\n    :typeExternalId::uuid IS NULL\n    OR ct.external_id = :typeExternalId::uuid\n  )\n  AND (\n    :search::text IS NULL\n    OR c.name ILIKE '%' || :search || '%'\n    OR c.notes ILIKE '%' || :search || '%'\n  )\nGROUP BY c.id, c.external_id, c.name, ct.external_id, ct.name, c.photo_url, c.photo_thumbnail_url, c.created_at, c.deleted_at\nORDER BY c.name ASC, c.created_at DESC\nLIMIT :pageSize\nOFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.name,
 *     ct.external_id AS type_external_id,
 *     ct.name AS type_name,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.created_at,
 *     c.deleted_at,
 *     COUNT(DISTINCT cm.id) FILTER (WHERE cm.id IS NOT NULL)::int AS member_count,
 *     COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_active = TRUE)::int AS active_member_count
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * INNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id
 * LEFT JOIN collectives.collective_memberships cm ON cm.collective_id = c.id
 * WHERE u.external_id = :userExternalId::uuid
 *   AND (
 *     :includeDeleted::boolean = TRUE
 *     OR c.deleted_at IS NULL
 *   )
 *   AND (
 *     :typeExternalId::uuid IS NULL
 *     OR ct.external_id = :typeExternalId::uuid
 *   )
 *   AND (
 *     :search::text IS NULL
 *     OR c.name ILIKE '%' || :search || '%'
 *     OR c.notes ILIKE '%' || :search || '%'
 *   )
 * GROUP BY c.id, c.external_id, c.name, ct.external_id, ct.name, c.photo_url, c.photo_thumbnail_url, c.created_at, c.deleted_at
 * ORDER BY c.name ASC, c.created_at DESC
 * LIMIT :pageSize
 * OFFSET :offset
 * ```
 */
export const getCollectivesByUserId = new PreparedQuery<IGetCollectivesByUserIdParams,IGetCollectivesByUserIdResult>(getCollectivesByUserIdIR);


/** 'CountCollectivesByUserId' parameters type */
export interface ICountCollectivesByUserIdParams {
  includeDeleted?: boolean | null | void;
  search?: string | null | void;
  typeExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CountCollectivesByUserId' return type */
export interface ICountCollectivesByUserIdResult {
  total_count: number | null;
}

/** 'CountCollectivesByUserId' query type */
export interface ICountCollectivesByUserIdQuery {
  params: ICountCollectivesByUserIdParams;
  result: ICountCollectivesByUserIdResult;
}

const countCollectivesByUserIdIR: any = {"usedParamSet":{"userExternalId":true,"includeDeleted":true,"typeExternalId":true,"search":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":220,"b":234}]},{"name":"includeDeleted","required":false,"transform":{"type":"scalar"},"locs":[{"a":254,"b":268}]},{"name":"typeExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":330,"b":344},{"a":384,"b":398}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":422,"b":428},{"a":471,"b":477},{"a":514,"b":520}]}],"statement":"SELECT COUNT(DISTINCT c.id)::int AS total_count\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nINNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id\nWHERE u.external_id = :userExternalId::uuid\n  AND (\n    :includeDeleted::boolean = TRUE\n    OR c.deleted_at IS NULL\n  )\n  AND (\n    :typeExternalId::uuid IS NULL\n    OR ct.external_id = :typeExternalId::uuid\n  )\n  AND (\n    :search::text IS NULL\n    OR c.name ILIKE '%' || :search || '%'\n    OR c.notes ILIKE '%' || :search || '%'\n  )"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(DISTINCT c.id)::int AS total_count
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * INNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id
 * WHERE u.external_id = :userExternalId::uuid
 *   AND (
 *     :includeDeleted::boolean = TRUE
 *     OR c.deleted_at IS NULL
 *   )
 *   AND (
 *     :typeExternalId::uuid IS NULL
 *     OR ct.external_id = :typeExternalId::uuid
 *   )
 *   AND (
 *     :search::text IS NULL
 *     OR c.name ILIKE '%' || :search || '%'
 *     OR c.notes ILIKE '%' || :search || '%'
 *   )
 * ```
 */
export const countCollectivesByUserId = new PreparedQuery<ICountCollectivesByUserIdParams,ICountCollectivesByUserIdResult>(countCollectivesByUserIdIR);


/** 'GetCollectiveById' parameters type */
export interface IGetCollectiveByIdParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCollectiveById' return type */
export interface IGetCollectiveByIdResult {
  active_member_count: number | null;
  /** City (optional) */
  address_city: string | null;
  /** Country (optional) */
  address_country: string | null;
  /** Postal code (optional) */
  address_postal_code: string | null;
  /** State or province (optional) */
  address_state_province: string | null;
  /** Address line 1 (optional) */
  address_street_line1: string | null;
  /** Address line 2 (optional) */
  address_street_line2: string | null;
  created_at: Date;
  /** Soft delete timestamp - when set, collective is considered deleted */
  deleted_at: Date | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  member_count: number | null;
  /** Name of the collective (e.g., "The Smith Family", "Acme Corp") */
  name: string;
  /** Additional notes about the collective */
  notes: string | null;
  /** URL to collective photo thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to collective photo */
  photo_url: string | null;
  /** Description of the collective type */
  type_description: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  type_external_id: string;
  /** True for system-provided types, false for user-created */
  type_is_system_default: boolean;
  /** Type name (e.g., Family, Company, Club) */
  type_name: string;
  updated_at: Date;
}

/** 'GetCollectiveById' query type */
export interface IGetCollectiveByIdQuery {
  params: IGetCollectiveByIdParams;
  result: IGetCollectiveByIdResult;
}

const getCollectiveByIdIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":880,"b":900}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":930,"b":944}]}],"statement":"SELECT\n    c.external_id,\n    c.name,\n    ct.external_id AS type_external_id,\n    ct.name AS type_name,\n    ct.description AS type_description,\n    ct.is_system_default AS type_is_system_default,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.notes,\n    c.address_street_line1,\n    c.address_street_line2,\n    c.address_city,\n    c.address_state_province,\n    c.address_postal_code,\n    c.address_country,\n    c.created_at,\n    c.updated_at,\n    c.deleted_at,\n    COUNT(DISTINCT cm.id) FILTER (WHERE cm.id IS NOT NULL)::int AS member_count,\n    COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_active = TRUE)::int AS active_member_count\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nINNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id\nLEFT JOIN collectives.collective_memberships cm ON cm.collective_id = c.id\nWHERE c.external_id = :collectiveExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\nGROUP BY c.id, c.external_id, c.name, ct.external_id, ct.name, ct.description, ct.is_system_default,\n         c.photo_url, c.photo_thumbnail_url, c.notes,\n         c.address_street_line1, c.address_street_line2, c.address_city,\n         c.address_state_province, c.address_postal_code, c.address_country,\n         c.created_at, c.updated_at, c.deleted_at"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.name,
 *     ct.external_id AS type_external_id,
 *     ct.name AS type_name,
 *     ct.description AS type_description,
 *     ct.is_system_default AS type_is_system_default,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.notes,
 *     c.address_street_line1,
 *     c.address_street_line2,
 *     c.address_city,
 *     c.address_state_province,
 *     c.address_postal_code,
 *     c.address_country,
 *     c.created_at,
 *     c.updated_at,
 *     c.deleted_at,
 *     COUNT(DISTINCT cm.id) FILTER (WHERE cm.id IS NOT NULL)::int AS member_count,
 *     COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_active = TRUE)::int AS active_member_count
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * INNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id
 * LEFT JOIN collectives.collective_memberships cm ON cm.collective_id = c.id
 * WHERE c.external_id = :collectiveExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 * GROUP BY c.id, c.external_id, c.name, ct.external_id, ct.name, ct.description, ct.is_system_default,
 *          c.photo_url, c.photo_thumbnail_url, c.notes,
 *          c.address_street_line1, c.address_street_line2, c.address_city,
 *          c.address_state_province, c.address_postal_code, c.address_country,
 *          c.created_at, c.updated_at, c.deleted_at
 * ```
 */
export const getCollectiveById = new PreparedQuery<IGetCollectiveByIdParams,IGetCollectiveByIdResult>(getCollectiveByIdIR);


/** 'GetMemberPreview' parameters type */
export interface IGetMemberPreviewParams {
  collectiveExternalId?: string | null | void;
  limit?: NumberOrString | null | void;
}

/** 'GetMemberPreview' return type */
export interface IGetMemberPreviewResult {
  display_name: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to original profile picture */
  photo_url: string | null;
}

/** 'GetMemberPreview' query type */
export interface IGetMemberPreviewQuery {
  params: IGetMemberPreviewParams;
  result: IGetMemberPreviewResult;
}

const getMemberPreviewIR: any = {"usedParamSet":{"collectiveExternalId":true,"limit":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":334,"b":354}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":447,"b":452}]}],"statement":"-- Gets first N members for list preview\nSELECT\n    f.external_id,\n    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,\n    f.photo_url\nFROM friends.friends f\nINNER JOIN collectives.collective_memberships cm ON cm.contact_id = f.id\nINNER JOIN collectives.collectives c ON cm.collective_id = c.id\nWHERE c.external_id = :collectiveExternalId::uuid\n  AND cm.is_active = TRUE\n  AND f.deleted_at IS NULL\nORDER BY display_name ASC\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets first N members for list preview
 * SELECT
 *     f.external_id,
 *     COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
 *     f.photo_url
 * FROM friends.friends f
 * INNER JOIN collectives.collective_memberships cm ON cm.contact_id = f.id
 * INNER JOIN collectives.collectives c ON cm.collective_id = c.id
 * WHERE c.external_id = :collectiveExternalId::uuid
 *   AND cm.is_active = TRUE
 *   AND f.deleted_at IS NULL
 * ORDER BY display_name ASC
 * LIMIT :limit
 * ```
 */
export const getMemberPreview = new PreparedQuery<IGetMemberPreviewParams,IGetMemberPreviewResult>(getMemberPreviewIR);


/** 'GetMemberPreviewBatch' parameters type */
export interface IGetMemberPreviewBatchParams {
  collectiveExternalIds?: stringArray | null | void;
  limit?: NumberOrString | null | void;
}

/** 'GetMemberPreviewBatch' return type */
export interface IGetMemberPreviewBatchResult {
  /** Public UUID for API exposure (always use this in APIs) */
  collective_external_id: string;
  display_name: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to original profile picture */
  photo_url: string | null;
}

/** 'GetMemberPreviewBatch' query type */
export interface IGetMemberPreviewBatchQuery {
  params: IGetMemberPreviewBatchParams;
  result: IGetMemberPreviewBatchResult;
}

const getMemberPreviewBatchIR: any = {"usedParamSet":{"limit":true,"collectiveExternalIds":true},"params":[{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":599,"b":604}]},{"name":"collectiveExternalIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":638,"b":659}]}],"statement":"-- Gets first N members for each collective in a batch (avoids N+1)\nSELECT\n    c.external_id AS collective_external_id,\n    sub.external_id,\n    sub.display_name,\n    sub.photo_url\nFROM collectives.collectives c\nCROSS JOIN LATERAL (\n    SELECT\n        f.external_id,\n        COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,\n        f.photo_url\n    FROM friends.friends f\n    INNER JOIN collectives.collective_memberships cm ON cm.contact_id = f.id\n    WHERE cm.collective_id = c.id\n      AND cm.is_active = TRUE\n      AND f.deleted_at IS NULL\n    ORDER BY display_name ASC\n    LIMIT :limit\n) sub\nWHERE c.external_id = ANY(:collectiveExternalIds::uuid[])"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets first N members for each collective in a batch (avoids N+1)
 * SELECT
 *     c.external_id AS collective_external_id,
 *     sub.external_id,
 *     sub.display_name,
 *     sub.photo_url
 * FROM collectives.collectives c
 * CROSS JOIN LATERAL (
 *     SELECT
 *         f.external_id,
 *         COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
 *         f.photo_url
 *     FROM friends.friends f
 *     INNER JOIN collectives.collective_memberships cm ON cm.contact_id = f.id
 *     WHERE cm.collective_id = c.id
 *       AND cm.is_active = TRUE
 *       AND f.deleted_at IS NULL
 *     ORDER BY display_name ASC
 *     LIMIT :limit
 * ) sub
 * WHERE c.external_id = ANY(:collectiveExternalIds::uuid[])
 * ```
 */
export const getMemberPreviewBatch = new PreparedQuery<IGetMemberPreviewBatchParams,IGetMemberPreviewBatchResult>(getMemberPreviewBatchIR);


/** 'GetMembersByCollectiveId' parameters type */
export interface IGetMembersByCollectiveIdParams {
  collectiveExternalId?: string | null | void;
  includeInactive?: boolean | null | void;
  userExternalId?: string | null | void;
}

/** 'GetMembersByCollectiveId' return type */
export interface IGetMembersByCollectiveIdResult {
  /** Public UUID for API exposure (always use this in APIs) */
  contact_external_id: string;
  created_at: Date;
  display_name: string | null;
  /** Date when membership became inactive */
  inactive_date: Date | null;
  /** Reason for deactivation (if inactive) */
  inactive_reason: string | null;
  /** Whether this membership is currently active */
  is_active: boolean;
  /** Date when member joined the collective */
  joined_date: Date | null;
  /** Public UUID for API exposure */
  membership_external_id: string;
  /** Notes about this membership */
  notes: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  /** Public UUID for API exposure */
  role_external_id: string;
  /** Role identifier (e.g., parent, child, employee) */
  role_key: string;
  /** Human-readable label for display */
  role_label: string;
  /** Display order within the type */
  role_sort_order: number;
  updated_at: Date;
}

/** 'GetMembersByCollectiveId' query type */
export interface IGetMembersByCollectiveIdQuery {
  params: IGetMembersByCollectiveIdParams;
  result: IGetMembersByCollectiveIdResult;
}

const getMembersByCollectiveIdIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true,"includeInactive":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":730,"b":750}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":780,"b":794}]},{"name":"includeInactive","required":false,"transform":{"type":"scalar"},"locs":[{"a":841,"b":856}]}],"statement":"SELECT\n    cm.external_id AS membership_external_id,\n    f.external_id AS contact_external_id,\n    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,\n    f.photo_url,\n    cr.external_id AS role_external_id,\n    cr.role_key,\n    cr.label AS role_label,\n    cr.sort_order AS role_sort_order,\n    cm.is_active,\n    cm.inactive_reason,\n    cm.inactive_date,\n    cm.joined_date,\n    cm.notes,\n    cm.created_at,\n    cm.updated_at\nFROM collectives.collective_memberships cm\nINNER JOIN friends.friends f ON cm.contact_id = f.id\nINNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id\nINNER JOIN collectives.collectives c ON cm.collective_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.deleted_at IS NULL\n  AND (\n    :includeInactive::boolean = TRUE\n    OR cm.is_active = TRUE\n  )\nORDER BY cm.is_active DESC, cr.sort_order ASC, display_name ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     cm.external_id AS membership_external_id,
 *     f.external_id AS contact_external_id,
 *     COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
 *     f.photo_url,
 *     cr.external_id AS role_external_id,
 *     cr.role_key,
 *     cr.label AS role_label,
 *     cr.sort_order AS role_sort_order,
 *     cm.is_active,
 *     cm.inactive_reason,
 *     cm.inactive_date,
 *     cm.joined_date,
 *     cm.notes,
 *     cm.created_at,
 *     cm.updated_at
 * FROM collectives.collective_memberships cm
 * INNER JOIN friends.friends f ON cm.contact_id = f.id
 * INNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id
 * INNER JOIN collectives.collectives c ON cm.collective_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.deleted_at IS NULL
 *   AND (
 *     :includeInactive::boolean = TRUE
 *     OR cm.is_active = TRUE
 *   )
 * ORDER BY cm.is_active DESC, cr.sort_order ASC, display_name ASC
 * ```
 */
export const getMembersByCollectiveId = new PreparedQuery<IGetMembersByCollectiveIdParams,IGetMembersByCollectiveIdResult>(getMembersByCollectiveIdIR);


/** 'CreateCollective' parameters type */
export interface ICreateCollectiveParams {
  addressCity?: string | null | void;
  addressCountry?: string | null | void;
  addressPostalCode?: string | null | void;
  addressStateProvince?: string | null | void;
  addressStreetLine1?: string | null | void;
  addressStreetLine2?: string | null | void;
  name?: string | null | void;
  notes?: string | null | void;
  photoThumbnailUrl?: string | null | void;
  photoUrl?: string | null | void;
  typeExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateCollective' return type */
export interface ICreateCollectiveResult {
  /** City (optional) */
  address_city: string | null;
  /** Country (optional) */
  address_country: string | null;
  /** Postal code (optional) */
  address_postal_code: string | null;
  /** State or province (optional) */
  address_state_province: string | null;
  /** Address line 1 (optional) */
  address_street_line1: string | null;
  /** Address line 2 (optional) */
  address_street_line2: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Name of the collective (e.g., "The Smith Family", "Acme Corp") */
  name: string;
  /** Additional notes about the collective */
  notes: string | null;
  /** URL to collective photo thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to collective photo */
  photo_url: string | null;
  updated_at: Date;
}

/** 'CreateCollective' query type */
export interface ICreateCollectiveQuery {
  params: ICreateCollectiveParams;
  result: ICreateCollectiveResult;
}

const createCollectiveIR: any = {"usedParamSet":{"name":true,"photoUrl":true,"photoThumbnailUrl":true,"notes":true,"addressStreetLine1":true,"addressStreetLine2":true,"addressCity":true,"addressStateProvince":true,"addressPostalCode":true,"addressCountry":true,"typeExternalId":true,"userExternalId":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":313,"b":317}]},{"name":"photoUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":324,"b":332}]},{"name":"photoThumbnailUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":339,"b":356}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":363,"b":368}]},{"name":"addressStreetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":375,"b":393}]},{"name":"addressStreetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":400,"b":418}]},{"name":"addressCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":425,"b":436}]},{"name":"addressStateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":443,"b":463}]},{"name":"addressPostalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":470,"b":487}]},{"name":"addressCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":494,"b":508}]},{"name":"typeExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":591,"b":605}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":635,"b":649}]}],"statement":"INSERT INTO collectives.collectives (\n    user_id,\n    collective_type_id,\n    name,\n    photo_url,\n    photo_thumbnail_url,\n    notes,\n    address_street_line1,\n    address_street_line2,\n    address_city,\n    address_state_province,\n    address_postal_code,\n    address_country\n)\nSELECT\n    u.id,\n    ct.id,\n    :name,\n    :photoUrl,\n    :photoThumbnailUrl,\n    :notes,\n    :addressStreetLine1,\n    :addressStreetLine2,\n    :addressCity,\n    :addressStateProvince,\n    :addressPostalCode,\n    :addressCountry\nFROM auth.users u\nINNER JOIN collectives.collective_types ct ON ct.external_id = :typeExternalId::uuid\nWHERE u.external_id = :userExternalId::uuid\n  AND (ct.is_system_default = TRUE OR ct.user_id = u.id)\nRETURNING\n    external_id,\n    name,\n    photo_url,\n    photo_thumbnail_url,\n    notes,\n    address_street_line1,\n    address_street_line2,\n    address_city,\n    address_state_province,\n    address_postal_code,\n    address_country,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO collectives.collectives (
 *     user_id,
 *     collective_type_id,
 *     name,
 *     photo_url,
 *     photo_thumbnail_url,
 *     notes,
 *     address_street_line1,
 *     address_street_line2,
 *     address_city,
 *     address_state_province,
 *     address_postal_code,
 *     address_country
 * )
 * SELECT
 *     u.id,
 *     ct.id,
 *     :name,
 *     :photoUrl,
 *     :photoThumbnailUrl,
 *     :notes,
 *     :addressStreetLine1,
 *     :addressStreetLine2,
 *     :addressCity,
 *     :addressStateProvince,
 *     :addressPostalCode,
 *     :addressCountry
 * FROM auth.users u
 * INNER JOIN collectives.collective_types ct ON ct.external_id = :typeExternalId::uuid
 * WHERE u.external_id = :userExternalId::uuid
 *   AND (ct.is_system_default = TRUE OR ct.user_id = u.id)
 * RETURNING
 *     external_id,
 *     name,
 *     photo_url,
 *     photo_thumbnail_url,
 *     notes,
 *     address_street_line1,
 *     address_street_line2,
 *     address_city,
 *     address_state_province,
 *     address_postal_code,
 *     address_country,
 *     created_at,
 *     updated_at
 * ```
 */
export const createCollective = new PreparedQuery<ICreateCollectiveParams,ICreateCollectiveResult>(createCollectiveIR);


/** 'UpdateCollective' parameters type */
export interface IUpdateCollectiveParams {
  addressCity?: string | null | void;
  addressCountry?: string | null | void;
  addressPostalCode?: string | null | void;
  addressStateProvince?: string | null | void;
  addressStreetLine1?: string | null | void;
  addressStreetLine2?: string | null | void;
  collectiveExternalId?: string | null | void;
  name?: string | null | void;
  notes?: string | null | void;
  photoThumbnailUrl?: string | null | void;
  photoUrl?: string | null | void;
  updateAddress?: boolean | null | void;
  updateNotes?: boolean | null | void;
  updatePhotoThumbnailUrl?: boolean | null | void;
  updatePhotoUrl?: boolean | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateCollective' return type */
export interface IUpdateCollectiveResult {
  /** City (optional) */
  address_city: string | null;
  /** Country (optional) */
  address_country: string | null;
  /** Postal code (optional) */
  address_postal_code: string | null;
  /** State or province (optional) */
  address_state_province: string | null;
  /** Address line 1 (optional) */
  address_street_line1: string | null;
  /** Address line 2 (optional) */
  address_street_line2: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Name of the collective (e.g., "The Smith Family", "Acme Corp") */
  name: string;
  /** Additional notes about the collective */
  notes: string | null;
  /** URL to collective photo thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to collective photo */
  photo_url: string | null;
  updated_at: Date;
}

/** 'UpdateCollective' query type */
export interface IUpdateCollectiveQuery {
  params: IUpdateCollectiveParams;
  result: IUpdateCollectiveResult;
}

const updateCollectiveIR: any = {"usedParamSet":{"name":true,"updatePhotoUrl":true,"photoUrl":true,"updatePhotoThumbnailUrl":true,"photoThumbnailUrl":true,"updateNotes":true,"notes":true,"updateAddress":true,"addressStreetLine1":true,"addressStreetLine2":true,"addressCity":true,"addressStateProvince":true,"addressPostalCode":true,"addressCountry":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":57,"b":61}]},{"name":"updatePhotoUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":107,"b":121}]},{"name":"photoUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":152}]},{"name":"updatePhotoThumbnailUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":232,"b":255}]},{"name":"photoThumbnailUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":295}]},{"name":"updateNotes","required":false,"transform":{"type":"scalar"},"locs":[{"a":371,"b":382}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":405,"b":410}]},{"name":"updateAddress","required":false,"transform":{"type":"scalar"},"locs":[{"a":487,"b":500},{"a":633,"b":646},{"a":771,"b":784},{"a":904,"b":917},{"a":1053,"b":1066},{"a":1192,"b":1205}]},{"name":"addressStreetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":523,"b":541}]},{"name":"addressStreetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":669,"b":687}]},{"name":"addressCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":807,"b":818}]},{"name":"addressStateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":940,"b":960}]},{"name":"addressPostalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":1089,"b":1106}]},{"name":"addressCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":1228,"b":1242}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1359,"b":1379}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1432,"b":1446}]}],"statement":"UPDATE collectives.collectives c\nSET\n    name = COALESCE(:name, c.name),\n    photo_url = CASE\n        WHEN :updatePhotoUrl::boolean = true THEN :photoUrl\n        ELSE c.photo_url\n    END,\n    photo_thumbnail_url = CASE\n        WHEN :updatePhotoThumbnailUrl::boolean = true THEN :photoThumbnailUrl\n        ELSE c.photo_thumbnail_url\n    END,\n    notes = CASE\n        WHEN :updateNotes::boolean = true THEN :notes\n        ELSE c.notes\n    END,\n    address_street_line1 = CASE\n        WHEN :updateAddress::boolean = true THEN :addressStreetLine1\n        ELSE c.address_street_line1\n    END,\n    address_street_line2 = CASE\n        WHEN :updateAddress::boolean = true THEN :addressStreetLine2\n        ELSE c.address_street_line2\n    END,\n    address_city = CASE\n        WHEN :updateAddress::boolean = true THEN :addressCity\n        ELSE c.address_city\n    END,\n    address_state_province = CASE\n        WHEN :updateAddress::boolean = true THEN :addressStateProvince\n        ELSE c.address_state_province\n    END,\n    address_postal_code = CASE\n        WHEN :updateAddress::boolean = true THEN :addressPostalCode\n        ELSE c.address_postal_code\n    END,\n    address_country = CASE\n        WHEN :updateAddress::boolean = true THEN :addressCountry\n        ELSE c.address_country\n    END,\n    updated_at = current_timestamp\nFROM auth.users u\nWHERE c.external_id = :collectiveExternalId::uuid\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.name,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.notes,\n    c.address_street_line1,\n    c.address_street_line2,\n    c.address_city,\n    c.address_state_province,\n    c.address_postal_code,\n    c.address_country,\n    c.created_at,\n    c.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collectives c
 * SET
 *     name = COALESCE(:name, c.name),
 *     photo_url = CASE
 *         WHEN :updatePhotoUrl::boolean = true THEN :photoUrl
 *         ELSE c.photo_url
 *     END,
 *     photo_thumbnail_url = CASE
 *         WHEN :updatePhotoThumbnailUrl::boolean = true THEN :photoThumbnailUrl
 *         ELSE c.photo_thumbnail_url
 *     END,
 *     notes = CASE
 *         WHEN :updateNotes::boolean = true THEN :notes
 *         ELSE c.notes
 *     END,
 *     address_street_line1 = CASE
 *         WHEN :updateAddress::boolean = true THEN :addressStreetLine1
 *         ELSE c.address_street_line1
 *     END,
 *     address_street_line2 = CASE
 *         WHEN :updateAddress::boolean = true THEN :addressStreetLine2
 *         ELSE c.address_street_line2
 *     END,
 *     address_city = CASE
 *         WHEN :updateAddress::boolean = true THEN :addressCity
 *         ELSE c.address_city
 *     END,
 *     address_state_province = CASE
 *         WHEN :updateAddress::boolean = true THEN :addressStateProvince
 *         ELSE c.address_state_province
 *     END,
 *     address_postal_code = CASE
 *         WHEN :updateAddress::boolean = true THEN :addressPostalCode
 *         ELSE c.address_postal_code
 *     END,
 *     address_country = CASE
 *         WHEN :updateAddress::boolean = true THEN :addressCountry
 *         ELSE c.address_country
 *     END,
 *     updated_at = current_timestamp
 * FROM auth.users u
 * WHERE c.external_id = :collectiveExternalId::uuid
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId::uuid
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     c.external_id,
 *     c.name,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.notes,
 *     c.address_street_line1,
 *     c.address_street_line2,
 *     c.address_city,
 *     c.address_state_province,
 *     c.address_postal_code,
 *     c.address_country,
 *     c.created_at,
 *     c.updated_at
 * ```
 */
export const updateCollective = new PreparedQuery<IUpdateCollectiveParams,IUpdateCollectiveResult>(updateCollectiveIR);


/** 'DeleteCollective' parameters type */
export interface IDeleteCollectiveParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteCollective' return type */
export interface IDeleteCollectiveResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'DeleteCollective' query type */
export interface IDeleteCollectiveQuery {
  params: IDeleteCollectiveParams;
  result: IDeleteCollectiveResult;
}

const deleteCollectiveIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":154}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":207,"b":221}]}],"statement":"-- Soft delete collective\nUPDATE collectives.collectives c\nSET deleted_at = current_timestamp\nFROM auth.users u\nWHERE c.external_id = :collectiveExternalId::uuid\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\n  AND c.deleted_at IS NULL\nRETURNING c.external_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Soft delete collective
 * UPDATE collectives.collectives c
 * SET deleted_at = current_timestamp
 * FROM auth.users u
 * WHERE c.external_id = :collectiveExternalId::uuid
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId::uuid
 *   AND c.deleted_at IS NULL
 * RETURNING c.external_id
 * ```
 */
export const deleteCollective = new PreparedQuery<IDeleteCollectiveParams,IDeleteCollectiveResult>(deleteCollectiveIR);


/** 'GetCollectiveInternalId' parameters type */
export interface IGetCollectiveInternalIdParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCollectiveInternalId' return type */
export interface IGetCollectiveInternalIdResult {
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetCollectiveInternalId' query type */
export interface IGetCollectiveInternalIdQuery {
  params: IGetCollectiveInternalIdParams;
  result: IGetCollectiveInternalIdResult;
}

const getCollectiveInternalIdIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":175}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":205,"b":219}]}],"statement":"-- Helper to get internal ID for a collective\nSELECT c.id\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId::uuid\n  AND u.external_id = :userExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * -- Helper to get internal ID for a collective
 * SELECT c.id
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 * ```
 */
export const getCollectiveInternalId = new PreparedQuery<IGetCollectiveInternalIdParams,IGetCollectiveInternalIdResult>(getCollectiveInternalIdIR);


/** 'GetRoleInternalId' parameters type */
export interface IGetRoleInternalIdParams {
  collectiveExternalId?: string | null | void;
  roleExternalId?: string | null | void;
}

/** 'GetRoleInternalId' return type */
export interface IGetRoleInternalIdResult {
  /** Internal sequential ID */
  id: number;
}

/** 'GetRoleInternalId' query type */
export interface IGetRoleInternalIdQuery {
  params: IGetRoleInternalIdParams;
  result: IGetRoleInternalIdResult;
}

const getRoleInternalIdIR: any = {"usedParamSet":{"roleExternalId":true,"collectiveExternalId":true},"params":[{"name":"roleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":258,"b":272}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":322}]}],"statement":"-- Helper to get internal ID for a role\nSELECT cr.id\nFROM collectives.collective_roles cr\nINNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id\nINNER JOIN collectives.collectives c ON c.collective_type_id = ct.id\nWHERE cr.external_id = :roleExternalId::uuid\n  AND c.external_id = :collectiveExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * -- Helper to get internal ID for a role
 * SELECT cr.id
 * FROM collectives.collective_roles cr
 * INNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id
 * INNER JOIN collectives.collectives c ON c.collective_type_id = ct.id
 * WHERE cr.external_id = :roleExternalId::uuid
 *   AND c.external_id = :collectiveExternalId::uuid
 * ```
 */
export const getRoleInternalId = new PreparedQuery<IGetRoleInternalIdParams,IGetRoleInternalIdResult>(getRoleInternalIdIR);


/** 'GetRoleByExternalId' parameters type */
export interface IGetRoleByExternalIdParams {
  collectiveExternalId?: string | null | void;
  roleExternalId?: string | null | void;
}

/** 'GetRoleByExternalId' return type */
export interface IGetRoleByExternalIdResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** Human-readable label for display */
  label: string;
  /** Role identifier (e.g., parent, child, employee) */
  role_key: string;
  /** Display order within the type */
  sort_order: number;
}

/** 'GetRoleByExternalId' query type */
export interface IGetRoleByExternalIdQuery {
  params: IGetRoleByExternalIdParams;
  result: IGetRoleByExternalIdResult;
}

const getRoleByExternalIdIR: any = {"usedParamSet":{"roleExternalId":true,"collectiveExternalId":true},"params":[{"name":"roleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":339,"b":353}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":383,"b":403}]}],"statement":"-- Gets full role info by external ID within a collective\nSELECT\n    cr.external_id,\n    cr.role_key,\n    cr.label,\n    cr.sort_order\nFROM collectives.collective_roles cr\nINNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id\nINNER JOIN collectives.collectives c ON c.collective_type_id = ct.id\nWHERE cr.external_id = :roleExternalId::uuid\n  AND c.external_id = :collectiveExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets full role info by external ID within a collective
 * SELECT
 *     cr.external_id,
 *     cr.role_key,
 *     cr.label,
 *     cr.sort_order
 * FROM collectives.collective_roles cr
 * INNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id
 * INNER JOIN collectives.collectives c ON c.collective_type_id = ct.id
 * WHERE cr.external_id = :roleExternalId::uuid
 *   AND c.external_id = :collectiveExternalId::uuid
 * ```
 */
export const getRoleByExternalId = new PreparedQuery<IGetRoleByExternalIdParams,IGetRoleByExternalIdResult>(getRoleByExternalIdIR);


/** 'GetContactInternalId' parameters type */
export interface IGetContactInternalIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetContactInternalId' return type */
export interface IGetContactInternalIdResult {
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetContactInternalId' query type */
export interface IGetContactInternalIdQuery {
  params: IGetContactInternalIdParams;
  result: IGetContactInternalIdResult;
}

const getContactInternalIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":161}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":191,"b":205}]}],"statement":"-- Helper to get internal ID for a contact\nSELECT f.id\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE f.external_id = :contactExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- Helper to get internal ID for a contact
 * SELECT f.id
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE f.external_id = :contactExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.deleted_at IS NULL
 * ```
 */
export const getContactInternalId = new PreparedQuery<IGetContactInternalIdParams,IGetContactInternalIdResult>(getContactInternalIdIR);


/** 'AddMembership' parameters type */
export interface IAddMembershipParams {
  collectiveId?: number | null | void;
  contactId?: number | null | void;
  joinedDate?: DateOrString | null | void;
  notes?: string | null | void;
  roleId?: number | null | void;
}

/** 'AddMembership' return type */
export interface IAddMembershipResult {
  /** The collective this membership belongs to */
  collective_id: number;
  /** The contact who is a member */
  contact_id: number;
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Internal sequential ID */
  id: number;
  /** Whether this membership is currently active */
  is_active: boolean;
  /** Date when member joined the collective */
  joined_date: Date | null;
  /** Notes about this membership */
  notes: string | null;
  /** The role of the member in this collective */
  role_id: number;
  updated_at: Date;
}

/** 'AddMembership' query type */
export interface IAddMembershipQuery {
  params: IAddMembershipParams;
  result: IAddMembershipResult;
}

const addMembershipIR: any = {"usedParamSet":{"collectiveId":true,"contactId":true,"roleId":true,"joinedDate":true,"notes":true},"params":[{"name":"collectiveId","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":151}]},{"name":"contactId","required":false,"transform":{"type":"scalar"},"locs":[{"a":158,"b":167}]},{"name":"roleId","required":false,"transform":{"type":"scalar"},"locs":[{"a":174,"b":180}]},{"name":"joinedDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":187,"b":197}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":210,"b":215}]}],"statement":"INSERT INTO collectives.collective_memberships (\n    collective_id,\n    contact_id,\n    role_id,\n    joined_date,\n    notes\n)\nVALUES (\n    :collectiveId,\n    :contactId,\n    :roleId,\n    :joinedDate::date,\n    :notes\n)\nRETURNING\n    id,\n    external_id,\n    collective_id,\n    contact_id,\n    role_id,\n    is_active,\n    joined_date,\n    notes,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO collectives.collective_memberships (
 *     collective_id,
 *     contact_id,
 *     role_id,
 *     joined_date,
 *     notes
 * )
 * VALUES (
 *     :collectiveId,
 *     :contactId,
 *     :roleId,
 *     :joinedDate::date,
 *     :notes
 * )
 * RETURNING
 *     id,
 *     external_id,
 *     collective_id,
 *     contact_id,
 *     role_id,
 *     is_active,
 *     joined_date,
 *     notes,
 *     created_at,
 *     updated_at
 * ```
 */
export const addMembership = new PreparedQuery<IAddMembershipParams,IAddMembershipResult>(addMembershipIR);


/** 'GetMembershipById' parameters type */
export interface IGetMembershipByIdParams {
  collectiveExternalId?: string | null | void;
  membershipExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetMembershipById' return type */
export interface IGetMembershipByIdResult {
  /** Public UUID for API exposure (always use this in APIs) */
  contact_external_id: string;
  created_at: Date;
  display_name: string | null;
  /** Internal sequential ID */
  id: number;
  /** Date when membership became inactive */
  inactive_date: Date | null;
  /** Reason for deactivation (if inactive) */
  inactive_reason: string | null;
  /** Whether this membership is currently active */
  is_active: boolean;
  /** Date when member joined the collective */
  joined_date: Date | null;
  /** Public UUID for API exposure */
  membership_external_id: string;
  /** Notes about this membership */
  notes: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  /** Public UUID for API exposure */
  role_external_id: string;
  /** Role identifier (e.g., parent, child, employee) */
  role_key: string;
  /** Human-readable label for display */
  role_label: string;
  /** Display order within the type */
  role_sort_order: number;
  updated_at: Date;
}

/** 'GetMembershipById' query type */
export interface IGetMembershipByIdQuery {
  params: IGetMembershipByIdParams;
  result: IGetMembershipByIdResult;
}

const getMembershipByIdIR: any = {"usedParamSet":{"membershipExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"membershipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":742,"b":762}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":792,"b":812}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":842,"b":856}]}],"statement":"SELECT\n    cm.id,\n    cm.external_id AS membership_external_id,\n    f.external_id AS contact_external_id,\n    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,\n    f.photo_url,\n    cr.external_id AS role_external_id,\n    cr.role_key,\n    cr.label AS role_label,\n    cr.sort_order AS role_sort_order,\n    cm.is_active,\n    cm.inactive_reason,\n    cm.inactive_date,\n    cm.joined_date,\n    cm.notes,\n    cm.created_at,\n    cm.updated_at\nFROM collectives.collective_memberships cm\nINNER JOIN friends.friends f ON cm.contact_id = f.id\nINNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id\nINNER JOIN collectives.collectives c ON cm.collective_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE cm.external_id = :membershipExternalId::uuid\n  AND c.external_id = :collectiveExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     cm.id,
 *     cm.external_id AS membership_external_id,
 *     f.external_id AS contact_external_id,
 *     COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
 *     f.photo_url,
 *     cr.external_id AS role_external_id,
 *     cr.role_key,
 *     cr.label AS role_label,
 *     cr.sort_order AS role_sort_order,
 *     cm.is_active,
 *     cm.inactive_reason,
 *     cm.inactive_date,
 *     cm.joined_date,
 *     cm.notes,
 *     cm.created_at,
 *     cm.updated_at
 * FROM collectives.collective_memberships cm
 * INNER JOIN friends.friends f ON cm.contact_id = f.id
 * INNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id
 * INNER JOIN collectives.collectives c ON cm.collective_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE cm.external_id = :membershipExternalId::uuid
 *   AND c.external_id = :collectiveExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.deleted_at IS NULL
 * ```
 */
export const getMembershipById = new PreparedQuery<IGetMembershipByIdParams,IGetMembershipByIdResult>(getMembershipByIdIR);


/** 'UpdateMembershipRole' parameters type */
export interface IUpdateMembershipRoleParams {
  collectiveExternalId?: string | null | void;
  membershipExternalId?: string | null | void;
  roleId?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateMembershipRole' return type */
export interface IUpdateMembershipRoleResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** The role of the member in this collective */
  role_id: number;
}

/** 'UpdateMembershipRole' query type */
export interface IUpdateMembershipRoleQuery {
  params: IUpdateMembershipRoleParams;
  result: IUpdateMembershipRoleResult;
}

const updateMembershipRoleIR: any = {"usedParamSet":{"roleId":true,"membershipExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"roleId","required":false,"transform":{"type":"scalar"},"locs":[{"a":63,"b":69}]},{"name":"membershipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":175,"b":195}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":298}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":328,"b":342}]}],"statement":"UPDATE collectives.collective_memberships cm\nSET\n    role_id = :roleId,\n    updated_at = current_timestamp\nFROM collectives.collectives c, auth.users u\nWHERE cm.external_id = :membershipExternalId::uuid\n  AND cm.collective_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :collectiveExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND cm.is_active = TRUE\nRETURNING cm.external_id, cm.role_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_memberships cm
 * SET
 *     role_id = :roleId,
 *     updated_at = current_timestamp
 * FROM collectives.collectives c, auth.users u
 * WHERE cm.external_id = :membershipExternalId::uuid
 *   AND cm.collective_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :collectiveExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND cm.is_active = TRUE
 * RETURNING cm.external_id, cm.role_id
 * ```
 */
export const updateMembershipRole = new PreparedQuery<IUpdateMembershipRoleParams,IUpdateMembershipRoleResult>(updateMembershipRoleIR);


/** 'DeactivateMembership' parameters type */
export interface IDeactivateMembershipParams {
  collectiveExternalId?: string | null | void;
  inactiveDate?: DateOrString | null | void;
  inactiveReason?: string | null | void;
  membershipExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeactivateMembership' return type */
export interface IDeactivateMembershipResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** Internal sequential ID */
  id: number;
}

/** 'DeactivateMembership' query type */
export interface IDeactivateMembershipQuery {
  params: IDeactivateMembershipParams;
  result: IDeactivateMembershipResult;
}

const deactivateMembershipIR: any = {"usedParamSet":{"inactiveReason":true,"inactiveDate":true,"membershipExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"inactiveReason","required":false,"transform":{"type":"scalar"},"locs":[{"a":94,"b":108}]},{"name":"inactiveDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":143}]},{"name":"membershipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":255,"b":275}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":358,"b":378}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":408,"b":422}]}],"statement":"UPDATE collectives.collective_memberships cm\nSET\n    is_active = FALSE,\n    inactive_reason = :inactiveReason,\n    inactive_date = :inactiveDate::date,\n    updated_at = current_timestamp\nFROM collectives.collectives c, auth.users u\nWHERE cm.external_id = :membershipExternalId::uuid\n  AND cm.collective_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :collectiveExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND cm.is_active = TRUE\nRETURNING cm.external_id, cm.id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_memberships cm
 * SET
 *     is_active = FALSE,
 *     inactive_reason = :inactiveReason,
 *     inactive_date = :inactiveDate::date,
 *     updated_at = current_timestamp
 * FROM collectives.collectives c, auth.users u
 * WHERE cm.external_id = :membershipExternalId::uuid
 *   AND cm.collective_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :collectiveExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND cm.is_active = TRUE
 * RETURNING cm.external_id, cm.id
 * ```
 */
export const deactivateMembership = new PreparedQuery<IDeactivateMembershipParams,IDeactivateMembershipResult>(deactivateMembershipIR);


/** 'ReactivateMembership' parameters type */
export interface IReactivateMembershipParams {
  collectiveExternalId?: string | null | void;
  membershipExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ReactivateMembership' return type */
export interface IReactivateMembershipResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'ReactivateMembership' query type */
export interface IReactivateMembershipQuery {
  params: IReactivateMembershipParams;
  result: IReactivateMembershipResult;
}

const reactivateMembershipIR: any = {"usedParamSet":{"membershipExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"membershipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":228,"b":248}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":331,"b":351}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":381,"b":395}]}],"statement":"UPDATE collectives.collective_memberships cm\nSET\n    is_active = TRUE,\n    inactive_reason = NULL,\n    inactive_date = NULL,\n    updated_at = current_timestamp\nFROM collectives.collectives c, auth.users u\nWHERE cm.external_id = :membershipExternalId::uuid\n  AND cm.collective_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :collectiveExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND cm.is_active = FALSE\nRETURNING cm.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_memberships cm
 * SET
 *     is_active = TRUE,
 *     inactive_reason = NULL,
 *     inactive_date = NULL,
 *     updated_at = current_timestamp
 * FROM collectives.collectives c, auth.users u
 * WHERE cm.external_id = :membershipExternalId::uuid
 *   AND cm.collective_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :collectiveExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND cm.is_active = FALSE
 * RETURNING cm.external_id
 * ```
 */
export const reactivateMembership = new PreparedQuery<IReactivateMembershipParams,IReactivateMembershipResult>(reactivateMembershipIR);


/** 'RemoveMembership' parameters type */
export interface IRemoveMembershipParams {
  collectiveExternalId?: string | null | void;
  membershipExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'RemoveMembership' return type */
export interface IRemoveMembershipResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** Internal sequential ID */
  id: number;
}

/** 'RemoveMembership' query type */
export interface IRemoveMembershipQuery {
  params: IRemoveMembershipParams;
  result: IRemoveMembershipResult;
}

const removeMembershipIR: any = {"usedParamSet":{"membershipExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"membershipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":208,"b":228}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":311,"b":331}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":361,"b":375}]}],"statement":"-- Note: This actually deletes the membership (use DeactivateMembership for soft delete)\nDELETE FROM collectives.collective_memberships cm\nUSING collectives.collectives c, auth.users u\nWHERE cm.external_id = :membershipExternalId::uuid\n  AND cm.collective_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :collectiveExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\nRETURNING cm.id, cm.external_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Note: This actually deletes the membership (use DeactivateMembership for soft delete)
 * DELETE FROM collectives.collective_memberships cm
 * USING collectives.collectives c, auth.users u
 * WHERE cm.external_id = :membershipExternalId::uuid
 *   AND cm.collective_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :collectiveExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 * RETURNING cm.id, cm.external_id
 * ```
 */
export const removeMembership = new PreparedQuery<IRemoveMembershipParams,IRemoveMembershipResult>(removeMembershipIR);


/** 'GetOtherActiveMembers' parameters type */
export interface IGetOtherActiveMembersParams {
  collectiveId?: number | null | void;
  excludeContactId?: number | null | void;
}

/** 'GetOtherActiveMembers' return type */
export interface IGetOtherActiveMembersResult {
  /** Public UUID for API exposure (always use this in APIs) */
  contact_external_id: string;
  /** Internal sequential ID (never expose in API) */
  contact_id: number;
  display_name: string | null;
  /** Public UUID for API exposure */
  membership_external_id: string;
  /** Internal sequential ID */
  membership_id: number;
  /** URL to original profile picture */
  photo_url: string | null;
  /** Public UUID for API exposure */
  role_external_id: string;
  /** Internal sequential ID */
  role_id: number;
  /** Role identifier (e.g., parent, child, employee) */
  role_key: string;
}

/** 'GetOtherActiveMembers' query type */
export interface IGetOtherActiveMembersQuery {
  params: IGetOtherActiveMembersParams;
  result: IGetOtherActiveMembersResult;
}

const getOtherActiveMembersIR: any = {"usedParamSet":{"collectiveId":true,"excludeContactId":true},"params":[{"name":"collectiveId","required":false,"transform":{"type":"scalar"},"locs":[{"a":624,"b":636}]},{"name":"excludeContactId","required":false,"transform":{"type":"scalar"},"locs":[{"a":705,"b":721}]}],"statement":"-- Get other active members of a collective (excluding a specific contact)\nSELECT\n    cm.id AS membership_id,\n    cm.external_id AS membership_external_id,\n    f.id AS contact_id,\n    f.external_id AS contact_external_id,\n    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,\n    f.photo_url,\n    cr.id AS role_id,\n    cr.external_id AS role_external_id,\n    cr.role_key\nFROM collectives.collective_memberships cm\nINNER JOIN friends.friends f ON cm.contact_id = f.id\nINNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id\nINNER JOIN collectives.collectives c ON cm.collective_id = c.id\nWHERE c.id = :collectiveId\n  AND cm.is_active = TRUE\n  AND f.deleted_at IS NULL\n  AND f.id != :excludeContactId"};

/**
 * Query generated from SQL:
 * ```
 * -- Get other active members of a collective (excluding a specific contact)
 * SELECT
 *     cm.id AS membership_id,
 *     cm.external_id AS membership_external_id,
 *     f.id AS contact_id,
 *     f.external_id AS contact_external_id,
 *     COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
 *     f.photo_url,
 *     cr.id AS role_id,
 *     cr.external_id AS role_external_id,
 *     cr.role_key
 * FROM collectives.collective_memberships cm
 * INNER JOIN friends.friends f ON cm.contact_id = f.id
 * INNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id
 * INNER JOIN collectives.collectives c ON cm.collective_id = c.id
 * WHERE c.id = :collectiveId
 *   AND cm.is_active = TRUE
 *   AND f.deleted_at IS NULL
 *   AND f.id != :excludeContactId
 * ```
 */
export const getOtherActiveMembers = new PreparedQuery<IGetOtherActiveMembersParams,IGetOtherActiveMembersResult>(getOtherActiveMembersIR);


/** 'GetRulesForTypeInternal' parameters type */
export interface IGetRulesForTypeInternalParams {
  collectiveTypeId?: number | null | void;
}

/** 'GetRulesForTypeInternal' return type */
export interface IGetRulesForTypeInternalResult {
  /** ...and there is an existing member with this role... */
  existing_member_role_id: number;
  /** When a member with this role is added... */
  new_member_role_id: number;
  /** Direction: new_member (new is from), existing_member (existing is from), both (bidirectional) */
  relationship_direction: string;
  /** ...create this relationship type */
  relationship_type_id: string;
}

/** 'GetRulesForTypeInternal' query type */
export interface IGetRulesForTypeInternalQuery {
  params: IGetRulesForTypeInternalParams;
  result: IGetRulesForTypeInternalResult;
}

const getRulesForTypeInternalIR: any = {"usedParamSet":{"collectiveTypeId":true},"params":[{"name":"collectiveTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":275,"b":291}]}],"statement":"-- Get rules by internal type ID for auto-relationship creation\nSELECT\n    crr.new_member_role_id,\n    crr.existing_member_role_id,\n    crr.relationship_type_id,\n    crr.relationship_direction\nFROM collectives.collective_relationship_rules crr\nWHERE crr.collective_type_id = :collectiveTypeId"};

/**
 * Query generated from SQL:
 * ```
 * -- Get rules by internal type ID for auto-relationship creation
 * SELECT
 *     crr.new_member_role_id,
 *     crr.existing_member_role_id,
 *     crr.relationship_type_id,
 *     crr.relationship_direction
 * FROM collectives.collective_relationship_rules crr
 * WHERE crr.collective_type_id = :collectiveTypeId
 * ```
 */
export const getRulesForTypeInternal = new PreparedQuery<IGetRulesForTypeInternalParams,IGetRulesForTypeInternalResult>(getRulesForTypeInternalIR);


/** 'GetCollectiveTypeIdForCollective' parameters type */
export interface IGetCollectiveTypeIdForCollectiveParams {
  collectiveId?: number | null | void;
}

/** 'GetCollectiveTypeIdForCollective' return type */
export interface IGetCollectiveTypeIdForCollectiveResult {
  /** Type of collective (family, company, etc.) */
  collective_type_id: number;
}

/** 'GetCollectiveTypeIdForCollective' query type */
export interface IGetCollectiveTypeIdForCollectiveQuery {
  params: IGetCollectiveTypeIdForCollectiveParams;
  result: IGetCollectiveTypeIdForCollectiveResult;
}

const getCollectiveTypeIdForCollectiveIR: any = {"usedParamSet":{"collectiveId":true},"params":[{"name":"collectiveId","required":false,"transform":{"type":"scalar"},"locs":[{"a":72,"b":84}]}],"statement":"SELECT c.collective_type_id\nFROM collectives.collectives c\nWHERE c.id = :collectiveId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT c.collective_type_id
 * FROM collectives.collectives c
 * WHERE c.id = :collectiveId
 * ```
 */
export const getCollectiveTypeIdForCollective = new PreparedQuery<IGetCollectiveTypeIdForCollectiveParams,IGetCollectiveTypeIdForCollectiveResult>(getCollectiveTypeIdForCollectiveIR);


/** 'CreateRelationshipWithSource' parameters type */
export interface ICreateRelationshipWithSourceParams {
  fromFriendId?: number | null | void;
  relationshipTypeId?: string | null | void;
  sourceMembershipId?: number | null | void;
  toFriendId?: number | null | void;
}

/** 'CreateRelationshipWithSource' return type */
export interface ICreateRelationshipWithSourceResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** Internal sequential ID */
  id: number;
}

/** 'CreateRelationshipWithSource' query type */
export interface ICreateRelationshipWithSourceQuery {
  params: ICreateRelationshipWithSourceParams;
  result: ICreateRelationshipWithSourceResult;
}

const createRelationshipWithSourceIR: any = {"usedParamSet":{"fromFriendId":true,"toFriendId":true,"relationshipTypeId":true,"sourceMembershipId":true},"params":[{"name":"fromFriendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":293,"b":305}]},{"name":"toFriendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":312,"b":322}]},{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":329,"b":347}]},{"name":"sourceMembershipId","required":false,"transform":{"type":"scalar"},"locs":[{"a":354,"b":372}]}],"statement":"-- Create a relationship with source_membership_id set.\n-- On conflict, update the source to track the latest membership that triggered creation.\nINSERT INTO friends.friend_relationships (\n    friend_id,\n    related_friend_id,\n    relationship_type_id,\n    source_membership_id\n)\nVALUES (\n    :fromFriendId,\n    :toFriendId,\n    :relationshipTypeId,\n    :sourceMembershipId\n)\nON CONFLICT (friend_id, related_friend_id, relationship_type_id)\nDO UPDATE SET source_membership_id = EXCLUDED.source_membership_id\nRETURNING external_id, id"};

/**
 * Query generated from SQL:
 * ```
 * -- Create a relationship with source_membership_id set.
 * -- On conflict, update the source to track the latest membership that triggered creation.
 * INSERT INTO friends.friend_relationships (
 *     friend_id,
 *     related_friend_id,
 *     relationship_type_id,
 *     source_membership_id
 * )
 * VALUES (
 *     :fromFriendId,
 *     :toFriendId,
 *     :relationshipTypeId,
 *     :sourceMembershipId
 * )
 * ON CONFLICT (friend_id, related_friend_id, relationship_type_id)
 * DO UPDATE SET source_membership_id = EXCLUDED.source_membership_id
 * RETURNING external_id, id
 * ```
 */
export const createRelationshipWithSource = new PreparedQuery<ICreateRelationshipWithSourceParams,ICreateRelationshipWithSourceResult>(createRelationshipWithSourceIR);


/** 'CheckRelationshipExists' parameters type */
export interface ICheckRelationshipExistsParams {
  fromFriendId?: number | null | void;
  relationshipTypeId?: string | null | void;
  toFriendId?: number | null | void;
}

/** 'CheckRelationshipExists' return type */
export interface ICheckRelationshipExistsResult {
  count: number | null;
}

/** 'CheckRelationshipExists' query type */
export interface ICheckRelationshipExistsQuery {
  params: ICheckRelationshipExistsParams;
  result: ICheckRelationshipExistsResult;
}

const checkRelationshipExistsIR: any = {"usedParamSet":{"fromFriendId":true,"toFriendId":true,"relationshipTypeId":true},"params":[{"name":"fromFriendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":156}]},{"name":"toFriendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":184,"b":194}]},{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":225,"b":243}]}],"statement":"-- Check if a relationship already exists between two friends\nSELECT COUNT(*)::int AS count\nFROM friends.friend_relationships\nWHERE friend_id = :fromFriendId\n  AND related_friend_id = :toFriendId\n  AND relationship_type_id = :relationshipTypeId"};

/**
 * Query generated from SQL:
 * ```
 * -- Check if a relationship already exists between two friends
 * SELECT COUNT(*)::int AS count
 * FROM friends.friend_relationships
 * WHERE friend_id = :fromFriendId
 *   AND related_friend_id = :toFriendId
 *   AND relationship_type_id = :relationshipTypeId
 * ```
 */
export const checkRelationshipExists = new PreparedQuery<ICheckRelationshipExistsParams,ICheckRelationshipExistsResult>(checkRelationshipExistsIR);


/** 'DeleteRelationshipsByMembershipId' parameters type */
export interface IDeleteRelationshipsByMembershipIdParams {
  membershipId?: number | null | void;
}

/** 'DeleteRelationshipsByMembershipId' return type */
export interface IDeleteRelationshipsByMembershipIdResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteRelationshipsByMembershipId' query type */
export interface IDeleteRelationshipsByMembershipIdQuery {
  params: IDeleteRelationshipsByMembershipIdParams;
  result: IDeleteRelationshipsByMembershipIdResult;
}

const deleteRelationshipsByMembershipIdIR: any = {"usedParamSet":{"membershipId":true},"params":[{"name":"membershipId","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":143}]}],"statement":"-- Delete all relationships created by a specific membership\nDELETE FROM friends.friend_relationships\nWHERE source_membership_id = :membershipId\nRETURNING external_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Delete all relationships created by a specific membership
 * DELETE FROM friends.friend_relationships
 * WHERE source_membership_id = :membershipId
 * RETURNING external_id
 * ```
 */
export const deleteRelationshipsByMembershipId = new PreparedQuery<IDeleteRelationshipsByMembershipIdParams,IDeleteRelationshipsByMembershipIdResult>(deleteRelationshipsByMembershipIdIR);


/** 'GetRelationshipTypeInfo' parameters type */
export interface IGetRelationshipTypeInfoParams {
  relationshipTypeId?: string | null | void;
}

/** 'GetRelationshipTypeInfo' return type */
export interface IGetRelationshipTypeInfoResult {
  /** Category: family, professional, or social */
  category: string;
  /** Relationship type identifier (e.g., spouse, parent, child) */
  id: string;
  /** The inverse relationship type (e.g., parent <-> child) */
  inverse_type_id: string | null;
  /** Human-readable label for display */
  label: string;
}

/** 'GetRelationshipTypeInfo' query type */
export interface IGetRelationshipTypeInfoQuery {
  params: IGetRelationshipTypeInfoParams;
  result: IGetRelationshipTypeInfoResult;
}

const getRelationshipTypeInfoIR: any = {"usedParamSet":{"relationshipTypeId":true},"params":[{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":163,"b":181}]}],"statement":"-- Get relationship type info for preview\nSELECT\n    rt.id,\n    rt.label,\n    rt.category,\n    rt.inverse_type_id\nFROM friends.relationship_types rt\nWHERE rt.id = :relationshipTypeId"};

/**
 * Query generated from SQL:
 * ```
 * -- Get relationship type info for preview
 * SELECT
 *     rt.id,
 *     rt.label,
 *     rt.category,
 *     rt.inverse_type_id
 * FROM friends.relationship_types rt
 * WHERE rt.id = :relationshipTypeId
 * ```
 */
export const getRelationshipTypeInfo = new PreparedQuery<IGetRelationshipTypeInfoParams,IGetRelationshipTypeInfoResult>(getRelationshipTypeInfoIR);


/** 'GetContactInfo' parameters type */
export interface IGetContactInfoParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetContactInfo' return type */
export interface IGetContactInfoResult {
  display_name: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Internal sequential ID (never expose in API) */
  id: number;
  /** URL to original profile picture */
  photo_url: string | null;
}

/** 'GetContactInfo' query type */
export interface IGetContactInfoQuery {
  params: IGetContactInfoParams;
  result: IGetContactInfoResult;
}

const getContactInfoIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":248,"b":265}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":295,"b":309}]}],"statement":"-- Get basic contact info for preview\nSELECT\n    f.id,\n    f.external_id,\n    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,\n    f.photo_url\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE f.external_id = :contactExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- Get basic contact info for preview
 * SELECT
 *     f.id,
 *     f.external_id,
 *     COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
 *     f.photo_url
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE f.external_id = :contactExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.deleted_at IS NULL
 * ```
 */
export const getContactInfo = new PreparedQuery<IGetContactInfoParams,IGetContactInfoResult>(getContactInfoIR);


/** 'GetCollectivesForContact' parameters type */
export interface IGetCollectivesForContactParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCollectivesForContact' return type */
export interface IGetCollectivesForContactResult {
  /** Public UUID for API exposure (always use this in APIs) */
  collective_external_id: string;
  /** Name of the collective (e.g., "The Smith Family", "Acme Corp") */
  collective_name: string;
  /** Whether this membership is currently active */
  is_active: boolean;
  /** Public UUID for API exposure */
  membership_external_id: string;
  /** Public UUID for API exposure */
  role_external_id: string;
  /** Role identifier (e.g., parent, child, employee) */
  role_key: string;
  /** Human-readable label for display */
  role_label: string;
  /** Display order within the type */
  role_sort_order: number;
  /** Type name (e.g., Family, Company, Club) */
  type_name: string;
}

/** 'GetCollectivesForContact' query type */
export interface IGetCollectivesForContactQuery {
  params: IGetCollectivesForContactParams;
  result: IGetCollectivesForContactResult;
}

const getCollectivesForContactIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":701,"b":718}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":748,"b":762}]}],"statement":"-- Get collectives a contact belongs to\nSELECT\n    c.external_id AS collective_external_id,\n    c.name AS collective_name,\n    ct.name AS type_name,\n    cr.external_id AS role_external_id,\n    cr.role_key,\n    cr.label AS role_label,\n    cr.sort_order AS role_sort_order,\n    cm.external_id AS membership_external_id,\n    cm.is_active\nFROM collectives.collective_memberships cm\nINNER JOIN collectives.collectives c ON cm.collective_id = c.id\nINNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id\nINNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id\nINNER JOIN friends.friends f ON cm.contact_id = f.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE f.external_id = :contactExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND c.deleted_at IS NULL\nORDER BY c.name ASC"};

/**
 * Query generated from SQL:
 * ```
 * -- Get collectives a contact belongs to
 * SELECT
 *     c.external_id AS collective_external_id,
 *     c.name AS collective_name,
 *     ct.name AS type_name,
 *     cr.external_id AS role_external_id,
 *     cr.role_key,
 *     cr.label AS role_label,
 *     cr.sort_order AS role_sort_order,
 *     cm.external_id AS membership_external_id,
 *     cm.is_active
 * FROM collectives.collective_memberships cm
 * INNER JOIN collectives.collectives c ON cm.collective_id = c.id
 * INNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id
 * INNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id
 * INNER JOIN friends.friends f ON cm.contact_id = f.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE f.external_id = :contactExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND c.deleted_at IS NULL
 * ORDER BY c.name ASC
 * ```
 */
export const getCollectivesForContact = new PreparedQuery<IGetCollectivesForContactParams,IGetCollectivesForContactResult>(getCollectivesForContactIR);


/** 'CheckDuplicateActiveMembership' parameters type */
export interface ICheckDuplicateActiveMembershipParams {
  collectiveExternalId?: string | null | void;
  contactExternalId?: string | null | void;
}

/** 'CheckDuplicateActiveMembership' return type */
export interface ICheckDuplicateActiveMembershipResult {
  count: number | null;
}

/** 'CheckDuplicateActiveMembership' query type */
export interface ICheckDuplicateActiveMembershipQuery {
  params: ICheckDuplicateActiveMembershipParams;
  result: ICheckDuplicateActiveMembershipResult;
}

const checkDuplicateActiveMembershipIR: any = {"usedParamSet":{"collectiveExternalId":true,"contactExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":285,"b":305}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":335,"b":352}]}],"statement":"-- Check if a contact already has an active membership in the collective\nSELECT COUNT(*)::int AS count\nFROM collectives.collective_memberships cm\nINNER JOIN collectives.collectives c ON cm.collective_id = c.id\nINNER JOIN friends.friends f ON cm.contact_id = f.id\nWHERE c.external_id = :collectiveExternalId::uuid\n  AND f.external_id = :contactExternalId::uuid\n  AND cm.is_active = TRUE"};

/**
 * Query generated from SQL:
 * ```
 * -- Check if a contact already has an active membership in the collective
 * SELECT COUNT(*)::int AS count
 * FROM collectives.collective_memberships cm
 * INNER JOIN collectives.collectives c ON cm.collective_id = c.id
 * INNER JOIN friends.friends f ON cm.contact_id = f.id
 * WHERE c.external_id = :collectiveExternalId::uuid
 *   AND f.external_id = :contactExternalId::uuid
 *   AND cm.is_active = TRUE
 * ```
 */
export const checkDuplicateActiveMembership = new PreparedQuery<ICheckDuplicateActiveMembershipParams,ICheckDuplicateActiveMembershipResult>(checkDuplicateActiveMembershipIR);


