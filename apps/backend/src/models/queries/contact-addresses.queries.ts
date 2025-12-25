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

const getAddressesByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":356,"b":373}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":397,"b":411}]}],"statement":"SELECT\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at\nFROM contacts.contact_addresses a\nINNER JOIN contacts.contacts c ON a.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY a.is_primary DESC, a.created_at ASC"};

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
 * FROM contacts.contact_addresses a
 * INNER JOIN contacts.contacts c ON a.contact_id = c.id
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

const getAddressByIdIR: any = {"usedParamSet":{"addressExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":356,"b":373}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":397,"b":414}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":438,"b":452}]}],"statement":"SELECT\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at\nFROM contacts.contact_addresses a\nINNER JOIN contacts.contacts c ON a.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.external_id = :addressExternalId\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM contacts.contact_addresses a
 * INNER JOIN contacts.contacts c ON a.contact_id = c.id
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

const createAddressIR: any = {"usedParamSet":{"streetLine1":true,"streetLine2":true,"city":true,"stateProvince":true,"postalCode":true,"country":true,"addressType":true,"label":true,"isPrimary":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"streetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":220,"b":231}]},{"name":"streetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":238,"b":249}]},{"name":"city","required":false,"transform":{"type":"scalar"},"locs":[{"a":256,"b":260}]},{"name":"stateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":267,"b":280}]},{"name":"postalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":287,"b":297}]},{"name":"country","required":false,"transform":{"type":"scalar"},"locs":[{"a":304,"b":311}]},{"name":"addressType","required":false,"transform":{"type":"scalar"},"locs":[{"a":318,"b":329}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":336,"b":341}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":348,"b":357}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":450,"b":467}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":491,"b":505}]}],"statement":"INSERT INTO contacts.contact_addresses (\n    contact_id,\n    street_line1,\n    street_line2,\n    city,\n    state_province,\n    postal_code,\n    country,\n    address_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :streetLine1,\n    :streetLine2,\n    :city,\n    :stateProvince,\n    :postalCode,\n    :country,\n    :addressType,\n    :label,\n    :isPrimary\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    street_line1,\n    street_line2,\n    city,\n    state_province,\n    postal_code,\n    country,\n    address_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_addresses (
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
 * FROM contacts.contacts c
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

const updateAddressIR: any = {"usedParamSet":{"streetLine1":true,"streetLine2":true,"city":true,"stateProvince":true,"postalCode":true,"country":true,"addressType":true,"label":true,"isPrimary":true,"addressExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"streetLine1","required":false,"transform":{"type":"scalar"},"locs":[{"a":59,"b":70}]},{"name":"streetLine2","required":false,"transform":{"type":"scalar"},"locs":[{"a":92,"b":103}]},{"name":"city","required":false,"transform":{"type":"scalar"},"locs":[{"a":117,"b":121}]},{"name":"stateProvince","required":false,"transform":{"type":"scalar"},"locs":[{"a":145,"b":158}]},{"name":"postalCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":179,"b":189}]},{"name":"country","required":false,"transform":{"type":"scalar"},"locs":[{"a":206,"b":213}]},{"name":"addressType","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":246}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":261,"b":266}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":286,"b":295}]},{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":388,"b":405}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":455,"b":472}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":496,"b":510}]}],"statement":"UPDATE contacts.contact_addresses a\nSET\n    street_line1 = :streetLine1,\n    street_line2 = :streetLine2,\n    city = :city,\n    state_province = :stateProvince,\n    postal_code = :postalCode,\n    country = :country,\n    address_type = :addressType,\n    label = :label,\n    is_primary = :isPrimary\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.external_id = :addressExternalId\n  AND a.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    a.external_id,\n    a.street_line1,\n    a.street_line2,\n    a.city,\n    a.state_province,\n    a.postal_code,\n    a.country,\n    a.address_type,\n    a.label,\n    a.is_primary,\n    a.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_addresses a
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
 * FROM contacts.contacts c
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

const deleteAddressIR: any = {"usedParamSet":{"addressExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"addressExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":120}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":193,"b":210}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":234,"b":248}]}],"statement":"DELETE FROM contacts.contact_addresses a\nUSING contacts.contacts c, auth.users u\nWHERE a.external_id = :addressExternalId\n  AND a.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING a.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_addresses a
 * USING contacts.contacts c, auth.users u
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

const clearPrimaryAddressIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":176,"b":193}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":217,"b":231}]}],"statement":"UPDATE contacts.contact_addresses a\nSET is_primary = false\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE a.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND a.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_addresses a
 * SET is_primary = false
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE a.contact_id = c.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND a.is_primary = true
 * ```
 */
export const clearPrimaryAddress = new PreparedQuery<IClearPrimaryAddressParams,IClearPrimaryAddressResult>(clearPrimaryAddressIR);


