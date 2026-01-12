/** Types generated for queries found in "src/models/queries/friend-phones.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetPhonesByFriendId' parameters type */
export interface IGetPhonesByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetPhonesByFriendId' return type */
export interface IGetPhonesByFriendIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
  /** Phone number (stored in E.164 format when possible) */
  phone_number: string;
  /** mobile, home, work, fax, other */
  phone_type: string;
}

/** 'GetPhonesByFriendId' query type */
export interface IGetPhonesByFriendIdQuery {
  params: IGetPhonesByFriendIdParams;
  result: IGetPhonesByFriendIdResult;
}

const getPhonesByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":258,"b":274}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":312}]}],"statement":"SELECT\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at\nFROM friends.friend_phones p\nINNER JOIN friends.friends c ON p.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY p.is_primary DESC, p.created_at ASC"};

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
 * FROM friends.friend_phones p
 * INNER JOIN friends.friends c ON p.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY p.is_primary DESC, p.created_at ASC
 * ```
 */
export const getPhonesByFriendId = new PreparedQuery<IGetPhonesByFriendIdParams,IGetPhonesByFriendIdResult>(getPhonesByFriendIdIR);


/** 'GetPhoneById' parameters type */
export interface IGetPhoneByIdParams {
  friendExternalId?: string | null | void;
  phoneExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetPhoneById' return type */
export interface IGetPhoneByIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
  /** Phone number (stored in E.164 format when possible) */
  phone_number: string;
  /** mobile, home, work, fax, other */
  phone_type: string;
}

/** 'GetPhoneById' query type */
export interface IGetPhoneByIdQuery {
  params: IGetPhoneByIdParams;
  result: IGetPhoneByIdResult;
}

const getPhoneByIdIR: any = {"usedParamSet":{"phoneExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":258,"b":273}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":297,"b":313}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":337,"b":351}]}],"statement":"SELECT\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at\nFROM friends.friend_phones p\nINNER JOIN friends.friends c ON p.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.external_id = :phoneExternalId\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM friends.friend_phones p
 * INNER JOIN friends.friends c ON p.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.external_id = :phoneExternalId
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getPhoneById = new PreparedQuery<IGetPhoneByIdParams,IGetPhoneByIdResult>(getPhoneByIdIR);


/** 'CreatePhone' parameters type */
export interface ICreatePhoneParams {
  friendExternalId?: string | null | void;
  isPrimary?: boolean | null | void;
  label?: string | null | void;
  phoneNumber?: string | null | void;
  phoneType?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreatePhone' return type */
export interface ICreatePhoneResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
  /** Phone number (stored in E.164 format when possible) */
  phone_number: string;
  /** mobile, home, work, fax, other */
  phone_type: string;
}

/** 'CreatePhone' query type */
export interface ICreatePhoneQuery {
  params: ICreatePhoneParams;
  result: ICreatePhoneResult;
}

const createPhoneIR: any = {"usedParamSet":{"phoneNumber":true,"phoneType":true,"label":true,"isPrimary":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"phoneNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":145}]},{"name":"phoneType","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":161}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":173}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":180,"b":189}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":280,"b":296}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":320,"b":334}]}],"statement":"INSERT INTO friends.friend_phones (\n    friend_id,\n    phone_number,\n    phone_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :phoneNumber,\n    :phoneType,\n    :label,\n    :isPrimary\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    phone_number,\n    phone_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_phones (
 *     friend_id,
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
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
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
  friendExternalId?: string | null | void;
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
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
  /** Phone number (stored in E.164 format when possible) */
  phone_number: string;
  /** mobile, home, work, fax, other */
  phone_type: string;
}

/** 'UpdatePhone' query type */
export interface IUpdatePhoneQuery {
  params: IUpdatePhoneParams;
  result: IUpdatePhoneResult;
}

const updatePhoneIR: any = {"usedParamSet":{"phoneNumber":true,"phoneType":true,"label":true,"isPrimary":true,"phoneExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"phoneNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":54,"b":65}]},{"name":"phoneType","required":false,"transform":{"type":"scalar"},"locs":[{"a":85,"b":94}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":109,"b":114}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":143}]},{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":234,"b":249}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":314}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":352}]}],"statement":"UPDATE friends.friend_phones p\nSET\n    phone_number = :phoneNumber,\n    phone_type = :phoneType,\n    label = :label,\n    is_primary = :isPrimary\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.external_id = :phoneExternalId\n  AND p.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_phones p
 * SET
 *     phone_number = :phoneNumber,
 *     phone_type = :phoneType,
 *     label = :label,
 *     is_primary = :isPrimary
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.external_id = :phoneExternalId
 *   AND p.friend_id = c.id
 *   AND c.external_id = :friendExternalId
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
  friendExternalId?: string | null | void;
  phoneExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeletePhone' return type */
export interface IDeletePhoneResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeletePhone' query type */
export interface IDeletePhoneQuery {
  params: IDeletePhoneParams;
  result: IDeletePhoneResult;
}

const deletePhoneIR: any = {"usedParamSet":{"phoneExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":96,"b":111}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":199}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":223,"b":237}]}],"statement":"DELETE FROM friends.friend_phones p\nUSING friends.friends c, auth.users u\nWHERE p.external_id = :phoneExternalId\n  AND p.friend_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING p.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_phones p
 * USING friends.friends c, auth.users u
 * WHERE p.external_id = :phoneExternalId
 *   AND p.friend_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING p.external_id
 * ```
 */
export const deletePhone = new PreparedQuery<IDeletePhoneParams,IDeletePhoneResult>(deletePhoneIR);


/** 'ClearPrimaryPhone' parameters type */
export interface IClearPrimaryPhoneParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryPhone' return type */
export type IClearPrimaryPhoneResult = void;

/** 'ClearPrimaryPhone' query type */
export interface IClearPrimaryPhoneQuery {
  params: IClearPrimaryPhoneParams;
  result: IClearPrimaryPhoneResult;
}

const clearPrimaryPhoneIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":184}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":208,"b":222}]}],"statement":"UPDATE friends.friend_phones p\nSET is_primary = false\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND p.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_phones p
 * SET is_primary = false
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.friend_id = c.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND p.is_primary = true
 * ```
 */
export const clearPrimaryPhone = new PreparedQuery<IClearPrimaryPhoneParams,IClearPrimaryPhoneResult>(clearPrimaryPhoneIR);


