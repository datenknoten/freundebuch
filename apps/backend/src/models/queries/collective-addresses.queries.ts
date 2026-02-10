/** Types generated for queries found in "src/models/queries/collective-addresses.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetAddressesByCollectiveId' parameters type */
export interface IGetAddressesByCollectiveIdParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetAddressesByCollectiveId' return type */
export interface IGetAddressesByCollectiveIdResult {
  /** Type of address: home, work, other */
  address_type: string;
  /** City name */
  city: string | null;
  /** Country name */
  country: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary address */
  is_primary: boolean;
  /** Custom label for this address */
  label: string | null;
  /** Postal or ZIP code */
  postal_code: string | null;
  /** State or province */
  state_province: string | null;
  /** Street address line 1 */
  street_line1: string | null;
  /** Street address line 2 (apt, suite, etc.) */
  street_line2: string | null;
}

/** 'GetAddressesByCollectiveId' query type */
export interface IGetAddressesByCollectiveIdQuery {
  params: IGetAddressesByCollectiveIdParams;
  result: IGetAddressesByCollectiveIdResult;
}

const getAddressesByCollectiveIdIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":371,"b":391}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":415,"b":429}]}],"statement":"SELECT\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at\nFROM collectives.collective_addresses a\nINNER JOIN collectives.collectives c ON a.collective_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY a.is_primary DESC, a.created_at ASC"};

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
 * FROM collectives.collective_addresses a
 * INNER JOIN collectives.collectives c ON a.collective_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY a.is_primary DESC, a.created_at ASC
 * ```
 */
export const getAddressesByCollectiveId = new PreparedQuery<IGetAddressesByCollectiveIdParams,IGetAddressesByCollectiveIdResult>(getAddressesByCollectiveIdIR);


/** 'GetAddressById' parameters type */
export interface IGetAddressByIdParams {
  addressExternalId?: string | null | void;
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetAddressById' return type */
export interface IGetAddressByIdResult {
  /** Type of address: home, work, other */
  address_type: string;
  /** City name */
  city: string | null;
  /** Country name */
  country: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary address */
  is_primary: boolean;
  /** Custom label for this address */
  label: string | null;
  /** Postal or ZIP code */
  postal_code: string | null;
  /** State or province */
  state_province: string | null;
  /** Street address line 1 */
  street_line1: string | null;
  /** Street address line 2 (apt, suite, etc.) */
  street_line2: string | null;
}

/** 'GetAddressById' query type */
export interface IGetAddressByIdQuery {
  params: IGetAddressByIdParams;
  result: IGetAddressByIdResult;
}

const getAddressByIdIR: any = {"usedParamSet":{"addressExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":371,"b":388}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":412,"b":432}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":456,"b":470}]}],"statement":"SELECT\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at\nFROM collectives.collective_addresses a\nINNER JOIN collectives.collectives c ON a.collective_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.external_id = :addressExternalId\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM collectives.collective_addresses a
 * INNER JOIN collectives.collectives c ON a.collective_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.external_id = :addressExternalId
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getAddressById = new PreparedQuery<IGetAddressByIdParams,IGetAddressByIdResult>(getAddressByIdIR);


/** 'CreateAddress' parameters type */
export interface ICreateAddressParams {
  addressType?: string | null | void;
  city?: string | null | void;
  collectiveExternalId?: string | null | void;
  country?: string | null | void;
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
  /** Type of address: home, work, other */
  address_type: string;
  /** City name */
  city: string | null;
  /** Country name */
  country: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary address */
  is_primary: boolean;
  /** Custom label for this address */
  label: string | null;
  /** Postal or ZIP code */
  postal_code: string | null;
  /** State or province */
  state_province: string | null;
  /** Street address line 1 */
  street_line1: string | null;
  /** Street address line 2 (apt, suite, etc.) */
  street_line2: string | null;
}

/** 'CreateAddress' query type */
export interface ICreateAddressQuery {
  params: ICreateAddressParams;
  result: ICreateAddressResult;
}

const createAddressIR: any = {"usedParamSet":{"streetLine1":true,"streetLine2":true,"city":true,"stateProvince":true,"postalCode":true,"country":true,"addressType":true,"label":true,"isPrimary":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"streetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":240}]},{"name":"streetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":247,"b":258}]},{"name":"city","required":false,"transform":{"type":"scalar"},"locs":[{"a":265,"b":269}]},{"name":"stateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":276,"b":289}]},{"name":"postalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":306}]},{"name":"country","required":false,"transform":{"type":"scalar"},"locs":[{"a":313,"b":320}]},{"name":"addressType","required":false,"transform":{"type":"scalar"},"locs":[{"a":327,"b":338}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":345,"b":350}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":357,"b":366}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":465,"b":485}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":509,"b":523}]}],"statement":"INSERT INTO collectives.collective_addresses (\n    collective_id,\n    street_line1,\n    street_line2,\n    city,\n    state_province,\n    postal_code,\n    country,\n    address_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :streetLine1,\n    :streetLine2,\n    :city,\n    :stateProvince,\n    :postalCode,\n    :country,\n    :addressType,\n    :label,\n    :isPrimary\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    street_line1,\n    street_line2,\n    city,\n    state_province,\n    postal_code,\n    country,\n    address_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO collectives.collective_addresses (
 *     collective_id,
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
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId
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
  collectiveExternalId?: string | null | void;
  country?: string | null | void;
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
  /** Type of address: home, work, other */
  address_type: string;
  /** City name */
  city: string | null;
  /** Country name */
  country: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary address */
  is_primary: boolean;
  /** Custom label for this address */
  label: string | null;
  /** Postal or ZIP code */
  postal_code: string | null;
  /** State or province */
  state_province: string | null;
  /** Street address line 1 */
  street_line1: string | null;
  /** Street address line 2 (apt, suite, etc.) */
  street_line2: string | null;
}

/** 'UpdateAddress' query type */
export interface IUpdateAddressQuery {
  params: IUpdateAddressParams;
  result: IUpdateAddressResult;
}

const updateAddressIR: any = {"usedParamSet":{"streetLine1":true,"streetLine2":true,"city":true,"stateProvince":true,"postalCode":true,"country":true,"addressType":true,"label":true,"isPrimary":true,"addressExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"streetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":65,"b":76}]},{"name":"streetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":98,"b":109}]},{"name":"city","required":false,"transform":{"type":"scalar"},"locs":[{"a":123,"b":127}]},{"name":"stateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":151,"b":164}]},{"name":"postalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":185,"b":195}]},{"name":"country","required":false,"transform":{"type":"scalar"},"locs":[{"a":212,"b":219}]},{"name":"addressType","required":false,"transform":{"type":"scalar"},"locs":[{"a":241,"b":252}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":267,"b":272}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":301}]},{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":400,"b":417}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":470,"b":490}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":514,"b":528}]}],"statement":"UPDATE collectives.collective_addresses a\nSET\n    street_line1 = :streetLine1,\n    street_line2 = :streetLine2,\n    city = :city,\n    state_province = :stateProvince,\n    postal_code = :postalCode,\n    country = :country,\n    address_type = :addressType,\n    label = :label,\n    is_primary = :isPrimary\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.external_id = :addressExternalId\n  AND a.collective_id = c.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_addresses a
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
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.external_id = :addressExternalId
 *   AND a.collective_id = c.id
 *   AND c.external_id = :collectiveExternalId
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
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteAddress' return type */
export interface IDeleteAddressResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'DeleteAddress' query type */
export interface IDeleteAddressQuery {
  params: IDeleteAddressParams;
  result: IDeleteAddressResult;
}

const deleteAddressIR: any = {"usedParamSet":{"addressExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":132}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":208,"b":228}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":266}]}],"statement":"DELETE FROM collectives.collective_addresses a\nUSING collectives.collectives c, auth.users u\nWHERE a.external_id = :addressExternalId\n  AND a.collective_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING a.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM collectives.collective_addresses a
 * USING collectives.collectives c, auth.users u
 * WHERE a.external_id = :addressExternalId
 *   AND a.collective_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING a.external_id
 * ```
 */
export const deleteAddress = new PreparedQuery<IDeleteAddressParams,IDeleteAddressResult>(deleteAddressIR);


/** 'ClearPrimaryAddress' parameters type */
export interface IClearPrimaryAddressParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryAddress' return type */
export type IClearPrimaryAddressResult = void;

/** 'ClearPrimaryAddress' query type */
export interface IClearPrimaryAddressQuery {
  params: IClearPrimaryAddressParams;
  result: IClearPrimaryAddressResult;
}

const clearPrimaryAddressIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":191,"b":211}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":249}]}],"statement":"UPDATE collectives.collective_addresses a\nSET is_primary = false\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.collective_id = c.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND a.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_addresses a
 * SET is_primary = false
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.collective_id = c.id
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND a.is_primary = true
 * ```
 */
export const clearPrimaryAddress = new PreparedQuery<IClearPrimaryAddressParams,IClearPrimaryAddressResult>(clearPrimaryAddressIR);


