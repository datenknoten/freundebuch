/** Types generated for queries found in "src/models/queries/collective-phones.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetPhonesByCollectiveId' parameters type */
export interface IGetPhonesByCollectiveIdParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetPhonesByCollectiveId' return type */
export interface IGetPhonesByCollectiveIdResult {
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary phone number */
  is_primary: boolean;
  /** Custom label for this phone number */
  label: string | null;
  /** The phone number */
  phone_number: string;
  /** Type of phone: mobile, home, work, fax, other */
  phone_type: string;
}

/** 'GetPhonesByCollectiveId' query type */
export interface IGetPhonesByCollectiveIdQuery {
  params: IGetPhonesByCollectiveIdParams;
  result: IGetPhonesByCollectiveIdResult;
}

const getPhonesByCollectiveIdIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":298}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":322,"b":336}]}],"statement":"SELECT\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at\nFROM collectives.collective_phones p\nINNER JOIN collectives.collectives c ON p.collective_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY p.is_primary DESC, p.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     p.external_id,
 *     p.phone_number,
 *     p.phone_type,
 *     p.label,
 *     p.is_primary,
 *     p.created_at
 * FROM collectives.collective_phones p
 * INNER JOIN collectives.collectives c ON p.collective_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY p.is_primary DESC, p.created_at ASC
 * ```
 */
export const getPhonesByCollectiveId = new PreparedQuery<IGetPhonesByCollectiveIdParams,IGetPhonesByCollectiveIdResult>(getPhonesByCollectiveIdIR);


/** 'GetPhoneById' parameters type */
export interface IGetPhoneByIdParams {
  collectiveExternalId?: string | null | void;
  phoneExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetPhoneById' return type */
export interface IGetPhoneByIdResult {
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary phone number */
  is_primary: boolean;
  /** Custom label for this phone number */
  label: string | null;
  /** The phone number */
  phone_number: string;
  /** Type of phone: mobile, home, work, fax, other */
  phone_type: string;
}

/** 'GetPhoneById' query type */
export interface IGetPhoneByIdQuery {
  params: IGetPhoneByIdParams;
  result: IGetPhoneByIdResult;
}

const getPhoneByIdIR: any = {"usedParamSet":{"phoneExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":293}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":317,"b":337}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":361,"b":375}]}],"statement":"SELECT\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at\nFROM collectives.collective_phones p\nINNER JOIN collectives.collectives c ON p.collective_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.external_id = :phoneExternalId\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     p.external_id,
 *     p.phone_number,
 *     p.phone_type,
 *     p.label,
 *     p.is_primary,
 *     p.created_at
 * FROM collectives.collective_phones p
 * INNER JOIN collectives.collectives c ON p.collective_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.external_id = :phoneExternalId
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getPhoneById = new PreparedQuery<IGetPhoneByIdParams,IGetPhoneByIdResult>(getPhoneByIdIR);


/** 'CreatePhone' parameters type */
export interface ICreatePhoneParams {
  collectiveExternalId?: string | null | void;
  isPrimary?: boolean | null | void;
  label?: string | null | void;
  phoneNumber?: string | null | void;
  phoneType?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreatePhone' return type */
export interface ICreatePhoneResult {
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary phone number */
  is_primary: boolean;
  /** Custom label for this phone number */
  label: string | null;
  /** The phone number */
  phone_number: string;
  /** Type of phone: mobile, home, work, fax, other */
  phone_type: string;
}

/** 'CreatePhone' query type */
export interface ICreatePhoneQuery {
  params: ICreatePhoneParams;
  result: ICreatePhoneResult;
}

const createPhoneIR: any = {"usedParamSet":{"phoneNumber":true,"phoneType":true,"label":true,"isPrimary":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"phoneNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":146,"b":157}]},{"name":"phoneType","required":false,"transform":{"type":"scalar"},"locs":[{"a":164,"b":173}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":180,"b":185}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":192,"b":201}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":300,"b":320}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":344,"b":358}]}],"statement":"INSERT INTO collectives.collective_phones (\n    collective_id,\n    phone_number,\n    phone_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :phoneNumber,\n    :phoneType,\n    :label,\n    :isPrimary\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    phone_number,\n    phone_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO collectives.collective_phones (
 *     collective_id,
 *     phone_number,
 *     phone_type,
 *     label,
 *     is_primary
 * )
 * SELECT
 *     c.id,
 *     :phoneNumber,
 *     :phoneType,
 *     :label,
 *     :isPrimary
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     phone_number,
 *     phone_type,
 *     label,
 *     is_primary,
 *     created_at
 * ```
 */
export const createPhone = new PreparedQuery<ICreatePhoneParams,ICreatePhoneResult>(createPhoneIR);


/** 'UpdatePhone' parameters type */
export interface IUpdatePhoneParams {
  collectiveExternalId?: string | null | void;
  isPrimary?: boolean | null | void;
  label?: string | null | void;
  phoneExternalId?: string | null | void;
  phoneNumber?: string | null | void;
  phoneType?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdatePhone' return type */
export interface IUpdatePhoneResult {
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary phone number */
  is_primary: boolean;
  /** Custom label for this phone number */
  label: string | null;
  /** The phone number */
  phone_number: string;
  /** Type of phone: mobile, home, work, fax, other */
  phone_type: string;
}

/** 'UpdatePhone' query type */
export interface IUpdatePhoneQuery {
  params: IUpdatePhoneParams;
  result: IUpdatePhoneResult;
}

const updatePhoneIR: any = {"usedParamSet":{"phoneNumber":true,"phoneType":true,"label":true,"isPrimary":true,"phoneExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"phoneNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":62,"b":73}]},{"name":"phoneType","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":102}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":117,"b":122}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":142,"b":151}]},{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":250,"b":265}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":318,"b":338}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":362,"b":376}]}],"statement":"UPDATE collectives.collective_phones p\nSET\n    phone_number = :phoneNumber,\n    phone_type = :phoneType,\n    label = :label,\n    is_primary = :isPrimary\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.external_id = :phoneExternalId\n  AND p.collective_id = c.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_phones p
 * SET
 *     phone_number = :phoneNumber,
 *     phone_type = :phoneType,
 *     label = :label,
 *     is_primary = :isPrimary
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.external_id = :phoneExternalId
 *   AND p.collective_id = c.id
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     p.external_id,
 *     p.phone_number,
 *     p.phone_type,
 *     p.label,
 *     p.is_primary,
 *     p.created_at
 * ```
 */
export const updatePhone = new PreparedQuery<IUpdatePhoneParams,IUpdatePhoneResult>(updatePhoneIR);


/** 'DeletePhone' parameters type */
export interface IDeletePhoneParams {
  collectiveExternalId?: string | null | void;
  phoneExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeletePhone' return type */
export interface IDeletePhoneResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'DeletePhone' query type */
export interface IDeletePhoneQuery {
  params: IDeletePhoneParams;
  result: IDeletePhoneResult;
}

const deletePhoneIR: any = {"usedParamSet":{"phoneExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":112,"b":127}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":203,"b":223}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":247,"b":261}]}],"statement":"DELETE FROM collectives.collective_phones p\nUSING collectives.collectives c, auth.users u\nWHERE p.external_id = :phoneExternalId\n  AND p.collective_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING p.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM collectives.collective_phones p
 * USING collectives.collectives c, auth.users u
 * WHERE p.external_id = :phoneExternalId
 *   AND p.collective_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING p.external_id
 * ```
 */
export const deletePhone = new PreparedQuery<IDeletePhoneParams,IDeletePhoneResult>(deletePhoneIR);


/** 'ClearPrimaryPhone' parameters type */
export interface IClearPrimaryPhoneParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryPhone' return type */
export type IClearPrimaryPhoneResult = void;

/** 'ClearPrimaryPhone' query type */
export interface IClearPrimaryPhoneQuery {
  params: IClearPrimaryPhoneParams;
  result: IClearPrimaryPhoneResult;
}

const clearPrimaryPhoneIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":208}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":232,"b":246}]}],"statement":"UPDATE collectives.collective_phones p\nSET is_primary = false\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.collective_id = c.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND p.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_phones p
 * SET is_primary = false
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.collective_id = c.id
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND p.is_primary = true
 * ```
 */
export const clearPrimaryPhone = new PreparedQuery<IClearPrimaryPhoneParams,IClearPrimaryPhoneResult>(clearPrimaryPhoneIR);


