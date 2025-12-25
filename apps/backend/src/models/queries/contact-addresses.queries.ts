/** Types generated for queries found in "src/models/queries/contact-addresses.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetAddressesByContactId' parameters type */
export interface IGetAddressesByContactIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetAddressesByContactId' return type */
export interface IGetAddressesByContactIdResult {
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

/** 'GetAddressesByContactId' query type */
export interface IGetAddressesByContactIdQuery {
  params: IGetAddressesByContactIdParams;
  result: IGetAddressesByContactIdResult;
}

const getAddressesByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":355}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":379,"b":393}]}],"statement":"SELECT\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at\nFROM contact_addresses a\nINNER JOIN contacts c ON a.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY a.is_primary DESC, a.created_at ASC"};

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
 * FROM contact_addresses a
 * INNER JOIN contacts c ON a.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY a.is_primary DESC, a.created_at ASC
 * ```
 */
export const getAddressesByContactId = new PreparedQuery<IGetAddressesByContactIdParams,IGetAddressesByContactIdResult>(getAddressesByContactIdIR);


/** 'GetAddressById' parameters type */
export interface IGetAddressByIdParams {
  addressExternalId?: string | null | void;
  contactExternalId?: string | null | void;
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

const getAddressByIdIR: any = {"usedParamSet":{"addressExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":355}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":379,"b":396}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":420,"b":434}]}],"statement":"SELECT\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at\nFROM contact_addresses a\nINNER JOIN contacts c ON a.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.external_id = :addressExternalId\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM contact_addresses a
 * INNER JOIN contacts c ON a.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.external_id = :addressExternalId
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getAddressById = new PreparedQuery<IGetAddressByIdParams,IGetAddressByIdResult>(getAddressByIdIR);


/** 'CreateAddress' parameters type */
export interface ICreateAddressParams {
  addressType?: string | null | void;
  city?: string | null | void;
  contactExternalId?: string | null | void;
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

const createAddressIR: any = {"usedParamSet":{"streetLine1":true,"streetLine2":true,"city":true,"stateProvince":true,"postalCode":true,"country":true,"addressType":true,"label":true,"isPrimary":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"streetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":211,"b":222}]},{"name":"streetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":240}]},{"name":"city","required":false,"transform":{"type":"scalar"},"locs":[{"a":247,"b":251}]},{"name":"stateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":258,"b":271}]},{"name":"postalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":288}]},{"name":"country","required":false,"transform":{"type":"scalar"},"locs":[{"a":295,"b":302}]},{"name":"addressType","required":false,"transform":{"type":"scalar"},"locs":[{"a":309,"b":320}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":327,"b":332}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":339,"b":348}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":432,"b":449}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":473,"b":487}]}],"statement":"INSERT INTO contact_addresses (\n    contact_id,\n    street_line1,\n    street_line2,\n    city,\n    state_province,\n    postal_code,\n    country,\n    address_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :streetLine1,\n    :streetLine2,\n    :city,\n    :stateProvince,\n    :postalCode,\n    :country,\n    :addressType,\n    :label,\n    :isPrimary\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    street_line1,\n    street_line2,\n    city,\n    state_province,\n    postal_code,\n    country,\n    address_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contact_addresses (
 *     contact_id,
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
 * FROM contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
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

const updateAddressIR: any = {"usedParamSet":{"streetLine1":true,"streetLine2":true,"city":true,"stateProvince":true,"postalCode":true,"country":true,"addressType":true,"label":true,"isPrimary":true,"addressExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"streetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":50,"b":61}]},{"name":"streetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":83,"b":94}]},{"name":"city","required":false,"transform":{"type":"scalar"},"locs":[{"a":108,"b":112}]},{"name":"stateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":136,"b":149}]},{"name":"postalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":170,"b":180}]},{"name":"country","required":false,"transform":{"type":"scalar"},"locs":[{"a":197,"b":204}]},{"name":"addressType","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":237}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":257}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":277,"b":286}]},{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":370,"b":387}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":437,"b":454}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":478,"b":492}]}],"statement":"UPDATE contact_addresses a\nSET\n    street_line1 = :streetLine1,\n    street_line2 = :streetLine2,\n    city = :city,\n    state_province = :stateProvince,\n    postal_code = :postalCode,\n    country = :country,\n    address_type = :addressType,\n    label = :label,\n    is_primary = :isPrimary\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.external_id = :addressExternalId\n  AND a.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contact_addresses a
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
 * FROM contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.external_id = :addressExternalId
 *   AND a.contact_id = c.id
 *   AND c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
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

const deleteAddressIR: any = {"usedParamSet":{"addressExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":85,"b":102}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":175,"b":192}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":216,"b":230}]}],"statement":"DELETE FROM contact_addresses a\nUSING contacts c, auth.users u\nWHERE a.external_id = :addressExternalId\n  AND a.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING a.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contact_addresses a
 * USING contacts c, auth.users u
 * WHERE a.external_id = :addressExternalId
 *   AND a.contact_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING a.external_id
 * ```
 */
export const deleteAddress = new PreparedQuery<IDeleteAddressParams,IDeleteAddressResult>(deleteAddressIR);


/** 'ClearPrimaryAddress' parameters type */
export interface IClearPrimaryAddressParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryAddress' return type */
export type IClearPrimaryAddressResult = void;

/** 'ClearPrimaryAddress' query type */
export interface IClearPrimaryAddressQuery {
  params: IClearPrimaryAddressParams;
  result: IClearPrimaryAddressResult;
}

const clearPrimaryAddressIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":158,"b":175}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":199,"b":213}]}],"statement":"UPDATE contact_addresses a\nSET is_primary = false\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND a.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contact_addresses a
 * SET is_primary = false
 * FROM contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.contact_id = c.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND a.is_primary = true
 * ```
 */
export const clearPrimaryAddress = new PreparedQuery<IClearPrimaryAddressParams,IClearPrimaryAddressResult>(clearPrimaryAddressIR);


