/** Types generated for queries found in "src/models/queries/contact-phones.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetPhonesByContactId' parameters type */
export interface IGetPhonesByContactIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetPhonesByContactId' return type */
export interface IGetPhonesByContactIdResult {
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

/** 'GetPhonesByContactId' query type */
export interface IGetPhonesByContactIdQuery {
  params: IGetPhonesByContactIdParams;
  result: IGetPhonesByContactIdResult;
}

const getPhonesByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":263,"b":280}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":304,"b":318}]}],"statement":"SELECT\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at\nFROM contacts.contact_phones p\nINNER JOIN contacts.contacts c ON p.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY p.is_primary DESC, p.created_at ASC"};

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
 * FROM contacts.contact_phones p
 * INNER JOIN contacts.contacts c ON p.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY p.is_primary DESC, p.created_at ASC
 * ```
 */
export const getPhonesByContactId = new PreparedQuery<IGetPhonesByContactIdParams,IGetPhonesByContactIdResult>(getPhonesByContactIdIR);


/** 'GetPhoneById' parameters type */
export interface IGetPhoneByIdParams {
  contactExternalId?: string | null | void;
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

const getPhoneByIdIR: any = {"usedParamSet":{"phoneExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":263,"b":278}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":319}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":343,"b":357}]}],"statement":"SELECT\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at\nFROM contacts.contact_phones p\nINNER JOIN contacts.contacts c ON p.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.external_id = :phoneExternalId\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM contacts.contact_phones p
 * INNER JOIN contacts.contacts c ON p.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.external_id = :phoneExternalId
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getPhoneById = new PreparedQuery<IGetPhoneByIdParams,IGetPhoneByIdResult>(getPhoneByIdIR);


/** 'CreatePhone' parameters type */
export interface ICreatePhoneParams {
  contactExternalId?: string | null | void;
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

const createPhoneIR: any = {"usedParamSet":{"phoneNumber":true,"phoneType":true,"label":true,"isPrimary":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"phoneNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":137,"b":148}]},{"name":"phoneType","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":164}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":171,"b":176}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":192}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":285,"b":302}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":326,"b":340}]}],"statement":"INSERT INTO contacts.contact_phones (\n    contact_id,\n    phone_number,\n    phone_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :phoneNumber,\n    :phoneType,\n    :label,\n    :isPrimary\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    phone_number,\n    phone_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_phones (
 *     contact_id,
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
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
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

const updatePhoneIR: any = {"usedParamSet":{"phoneNumber":true,"phoneType":true,"label":true,"isPrimary":true,"phoneExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"phoneNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":56,"b":67}]},{"name":"phoneType","required":false,"transform":{"type":"scalar"},"locs":[{"a":87,"b":96}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":111,"b":116}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":136,"b":145}]},{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":238,"b":253}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":303,"b":320}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":344,"b":358}]}],"statement":"UPDATE contacts.contact_phones p\nSET\n    phone_number = :phoneNumber,\n    phone_type = :phoneType,\n    label = :label,\n    is_primary = :isPrimary\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.external_id = :phoneExternalId\n  AND p.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_phones p
 * SET
 *     phone_number = :phoneNumber,
 *     phone_type = :phoneType,
 *     label = :label,
 *     is_primary = :isPrimary
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.external_id = :phoneExternalId
 *   AND p.contact_id = c.id
 *   AND c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
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

const deletePhoneIR: any = {"usedParamSet":{"phoneExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":100,"b":115}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":205}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":243}]}],"statement":"DELETE FROM contacts.contact_phones p\nUSING contacts.contacts c, auth.users u\nWHERE p.external_id = :phoneExternalId\n  AND p.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING p.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_phones p
 * USING contacts.contacts c, auth.users u
 * WHERE p.external_id = :phoneExternalId
 *   AND p.contact_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING p.external_id
 * ```
 */
export const deletePhone = new PreparedQuery<IDeletePhoneParams,IDeletePhoneResult>(deletePhoneIR);


/** 'ClearPrimaryPhone' parameters type */
export interface IClearPrimaryPhoneParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryPhone' return type */
export type IClearPrimaryPhoneResult = void;

/** 'ClearPrimaryPhone' query type */
export interface IClearPrimaryPhoneQuery {
  params: IClearPrimaryPhoneParams;
  result: IClearPrimaryPhoneResult;
}

const clearPrimaryPhoneIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":173,"b":190}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":214,"b":228}]}],"statement":"UPDATE contacts.contact_phones p\nSET is_primary = false\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND p.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_phones p
 * SET is_primary = false
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.contact_id = c.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND p.is_primary = true
 * ```
 */
export const clearPrimaryPhone = new PreparedQuery<IClearPrimaryPhoneParams,IClearPrimaryPhoneResult>(clearPrimaryPhoneIR);


