/** Types generated for queries found in "src/models/queries/friend-addresses.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetAddressesByFriendId' parameters type */
export interface IGetAddressesByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetAddressesByFriendId' return type */
export interface IGetAddressesByFriendIdResult {
  /** home, work, other */
  address_type: string;
  city: string | null;
  country: string | null;
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
  postal_code: string | null;
  state_province: string | null;
  street_line1: string | null;
  street_line2: string | null;
}

/** 'GetAddressesByFriendId' query type */
export interface IGetAddressesByFriendIdQuery {
  params: IGetAddressesByFriendIdParams;
  result: IGetAddressesByFriendIdResult;
}

const getAddressesByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":351,"b":367}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":391,"b":405}]}],"statement":"SELECT\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at\nFROM friends.friend_addresses a\nINNER JOIN friends.friends c ON a.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY a.is_primary DESC, a.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     a.external_id,
 *     a.street_line1,
 *     a.street_line2,
 *     a.city,
 *     a.state_province,
 *     a.postal_code,
 *     a.country,
 *     a.address_type,
 *     a.label,
 *     a.is_primary,
 *     a.created_at
 * FROM friends.friend_addresses a
 * INNER JOIN friends.friends c ON a.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY a.is_primary DESC, a.created_at ASC
 * ```
 */
export const getAddressesByFriendId = new PreparedQuery<IGetAddressesByFriendIdParams,IGetAddressesByFriendIdResult>(getAddressesByFriendIdIR);


/** 'GetAddressById' parameters type */
export interface IGetAddressByIdParams {
  addressExternalId?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetAddressById' return type */
export interface IGetAddressByIdResult {
  /** home, work, other */
  address_type: string;
  city: string | null;
  country: string | null;
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
  postal_code: string | null;
  state_province: string | null;
  street_line1: string | null;
  street_line2: string | null;
}

/** 'GetAddressById' query type */
export interface IGetAddressByIdQuery {
  params: IGetAddressByIdParams;
  result: IGetAddressByIdResult;
}

const getAddressByIdIR: any = {"usedParamSet":{"addressExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":351,"b":368}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":392,"b":408}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":432,"b":446}]}],"statement":"SELECT\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at\nFROM friends.friend_addresses a\nINNER JOIN friends.friends c ON a.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.external_id = :addressExternalId\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     a.external_id,
 *     a.street_line1,
 *     a.street_line2,
 *     a.city,
 *     a.state_province,
 *     a.postal_code,
 *     a.country,
 *     a.address_type,
 *     a.label,
 *     a.is_primary,
 *     a.created_at
 * FROM friends.friend_addresses a
 * INNER JOIN friends.friends c ON a.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.external_id = :addressExternalId
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getAddressById = new PreparedQuery<IGetAddressByIdParams,IGetAddressByIdResult>(getAddressByIdIR);


/** 'CreateAddress' parameters type */
export interface ICreateAddressParams {
  addressType?: string | null | void;
  city?: string | null | void;
  country?: string | null | void;
  friendExternalId?: string | null | void;
  isPrimary?: boolean | null | void;
  label?: string | null | void;
  postalCode?: string | null | void;
  stateProvince?: string | null | void;
  streetLine1?: string | null | void;
  streetLine2?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateAddress' return type */
export interface ICreateAddressResult {
  /** home, work, other */
  address_type: string;
  city: string | null;
  country: string | null;
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
  postal_code: string | null;
  state_province: string | null;
  street_line1: string | null;
  street_line2: string | null;
}

/** 'CreateAddress' query type */
export interface ICreateAddressQuery {
  params: ICreateAddressParams;
  result: ICreateAddressResult;
}

const createAddressIR: any = {"usedParamSet":{"streetLine1":true,"streetLine2":true,"city":true,"stateProvince":true,"postalCode":true,"country":true,"addressType":true,"label":true,"isPrimary":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"streetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":217,"b":228}]},{"name":"streetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":246}]},{"name":"city","required":false,"transform":{"type":"scalar"},"locs":[{"a":253,"b":257}]},{"name":"stateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":264,"b":277}]},{"name":"postalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":294}]},{"name":"country","required":false,"transform":{"type":"scalar"},"locs":[{"a":301,"b":308}]},{"name":"addressType","required":false,"transform":{"type":"scalar"},"locs":[{"a":315,"b":326}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":333,"b":338}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":345,"b":354}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":445,"b":461}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":485,"b":499}]}],"statement":"INSERT INTO friends.friend_addresses (\n    friend_id,\n    street_line1,\n    street_line2,\n    city,\n    state_province,\n    postal_code,\n    country,\n    address_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :streetLine1,\n    :streetLine2,\n    :city,\n    :stateProvince,\n    :postalCode,\n    :country,\n    :addressType,\n    :label,\n    :isPrimary\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    street_line1,\n    street_line2,\n    city,\n    state_province,\n    postal_code,\n    country,\n    address_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_addresses (
 *     friend_id,
 *     street_line1,
 *     street_line2,
 *     city,
 *     state_province,
 *     postal_code,
 *     country,
 *     address_type,
 *     label,
 *     is_primary
 * )
 * SELECT
 *     c.id,
 *     :streetLine1,
 *     :streetLine2,
 *     :city,
 *     :stateProvince,
 *     :postalCode,
 *     :country,
 *     :addressType,
 *     :label,
 *     :isPrimary
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     street_line1,
 *     street_line2,
 *     city,
 *     state_province,
 *     postal_code,
 *     country,
 *     address_type,
 *     label,
 *     is_primary,
 *     created_at
 * ```
 */
export const createAddress = new PreparedQuery<ICreateAddressParams,ICreateAddressResult>(createAddressIR);


/** 'UpdateAddress' parameters type */
export interface IUpdateAddressParams {
  addressExternalId?: string | null | void;
  addressType?: string | null | void;
  city?: string | null | void;
  country?: string | null | void;
  friendExternalId?: string | null | void;
  isPrimary?: boolean | null | void;
  label?: string | null | void;
  postalCode?: string | null | void;
  stateProvince?: string | null | void;
  streetLine1?: string | null | void;
  streetLine2?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateAddress' return type */
export interface IUpdateAddressResult {
  /** home, work, other */
  address_type: string;
  city: string | null;
  country: string | null;
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
  postal_code: string | null;
  state_province: string | null;
  street_line1: string | null;
  street_line2: string | null;
}

/** 'UpdateAddress' query type */
export interface IUpdateAddressQuery {
  params: IUpdateAddressParams;
  result: IUpdateAddressResult;
}

const updateAddressIR: any = {"usedParamSet":{"streetLine1":true,"streetLine2":true,"city":true,"stateProvince":true,"postalCode":true,"country":true,"addressType":true,"label":true,"isPrimary":true,"addressExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"streetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":57,"b":68}]},{"name":"streetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":90,"b":101}]},{"name":"city","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":119}]},{"name":"stateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":156}]},{"name":"postalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":177,"b":187}]},{"name":"country","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":211}]},{"name":"addressType","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":244}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":264}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":293}]},{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":384,"b":401}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":450,"b":466}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":490,"b":504}]}],"statement":"UPDATE friends.friend_addresses a\nSET\n    street_line1 = :streetLine1,\n    street_line2 = :streetLine2,\n    city = :city,\n    state_province = :stateProvince,\n    postal_code = :postalCode,\n    country = :country,\n    address_type = :addressType,\n    label = :label,\n    is_primary = :isPrimary\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.external_id = :addressExternalId\n  AND a.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_addresses a
 * SET
 *     street_line1 = :streetLine1,
 *     street_line2 = :streetLine2,
 *     city = :city,
 *     state_province = :stateProvince,
 *     postal_code = :postalCode,
 *     country = :country,
 *     address_type = :addressType,
 *     label = :label,
 *     is_primary = :isPrimary
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.external_id = :addressExternalId
 *   AND a.friend_id = c.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     a.external_id,
 *     a.street_line1,
 *     a.street_line2,
 *     a.city,
 *     a.state_province,
 *     a.postal_code,
 *     a.country,
 *     a.address_type,
 *     a.label,
 *     a.is_primary,
 *     a.created_at
 * ```
 */
export const updateAddress = new PreparedQuery<IUpdateAddressParams,IUpdateAddressResult>(updateAddressIR);


/** 'DeleteAddress' parameters type */
export interface IDeleteAddressParams {
  addressExternalId?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteAddress' return type */
export interface IDeleteAddressResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteAddress' query type */
export interface IDeleteAddressQuery {
  params: IDeleteAddressParams;
  result: IDeleteAddressResult;
}

const deleteAddressIR: any = {"usedParamSet":{"addressExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":116}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":204}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":228,"b":242}]}],"statement":"DELETE FROM friends.friend_addresses a\nUSING friends.friends c, auth.users u\nWHERE a.external_id = :addressExternalId\n  AND a.friend_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING a.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_addresses a
 * USING friends.friends c, auth.users u
 * WHERE a.external_id = :addressExternalId
 *   AND a.friend_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING a.external_id
 * ```
 */
export const deleteAddress = new PreparedQuery<IDeleteAddressParams,IDeleteAddressResult>(deleteAddressIR);


/** 'ClearPrimaryAddress' parameters type */
export interface IClearPrimaryAddressParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryAddress' return type */
export type IClearPrimaryAddressResult = void;

/** 'ClearPrimaryAddress' query type */
export interface IClearPrimaryAddressQuery {
  params: IClearPrimaryAddressParams;
  result: IClearPrimaryAddressResult;
}

const clearPrimaryAddressIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":171,"b":187}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":211,"b":225}]}],"statement":"UPDATE friends.friend_addresses a\nSET is_primary = false\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND a.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_addresses a
 * SET is_primary = false
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.friend_id = c.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND a.is_primary = true
 * ```
 */
export const clearPrimaryAddress = new PreparedQuery<IClearPrimaryAddressParams,IClearPrimaryAddressResult>(clearPrimaryAddressIR);


