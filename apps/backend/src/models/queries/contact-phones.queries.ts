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

const getPhonesByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":262}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":286,"b":300}]}],"statement":"SELECT\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at\nFROM contact_phones p\nINNER JOIN contacts c ON p.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY p.is_primary DESC, p.created_at ASC"};

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
 * FROM contact_phones p
 * INNER JOIN contacts c ON p.contact_id = c.id
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

const getPhoneByIdIR: any = {"usedParamSet":{"phoneExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":260}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":301}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":325,"b":339}]}],"statement":"SELECT\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at\nFROM contact_phones p\nINNER JOIN contacts c ON p.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.external_id = :phoneExternalId\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM contact_phones p
 * INNER JOIN contacts c ON p.contact_id = c.id
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

const createPhoneIR: any = {"usedParamSet":{"phoneNumber":true,"phoneType":true,"label":true,"isPrimary":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"phoneNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":128,"b":139}]},{"name":"phoneType","required":false,"transform":{"type":"scalar"},"locs":[{"a":146,"b":155}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":162,"b":167}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":174,"b":183}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":267,"b":284}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":308,"b":322}]}],"statement":"INSERT INTO contact_phones (\n    contact_id,\n    phone_number,\n    phone_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :phoneNumber,\n    :phoneType,\n    :label,\n    :isPrimary\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    phone_number,\n    phone_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contact_phones (
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
 * FROM contacts c
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

const updatePhoneIR: any = {"usedParamSet":{"phoneNumber":true,"phoneType":true,"label":true,"isPrimary":true,"phoneExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"phoneNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":47,"b":58}]},{"name":"phoneType","required":false,"transform":{"type":"scalar"},"locs":[{"a":78,"b":87}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":102,"b":107}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":127,"b":136}]},{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":220,"b":235}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":285,"b":302}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":326,"b":340}]}],"statement":"UPDATE contact_phones p\nSET\n    phone_number = :phoneNumber,\n    phone_type = :phoneType,\n    label = :label,\n    is_primary = :isPrimary\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.external_id = :phoneExternalId\n  AND p.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    p.external_id,\n    p.phone_number,\n    p.phone_type,\n    p.label,\n    p.is_primary,\n    p.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contact_phones p
 * SET
 *     phone_number = :phoneNumber,
 *     phone_type = :phoneType,
 *     label = :label,
 *     is_primary = :isPrimary
 * FROM contacts c
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

const deletePhoneIR: any = {"usedParamSet":{"phoneExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"phoneExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":82,"b":97}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":170,"b":187}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":211,"b":225}]}],"statement":"DELETE FROM contact_phones p\nUSING contacts c, auth.users u\nWHERE p.external_id = :phoneExternalId\n  AND p.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING p.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contact_phones p
 * USING contacts c, auth.users u
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

const clearPrimaryPhoneIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":172}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":196,"b":210}]}],"statement":"UPDATE contact_phones p\nSET is_primary = false\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE p.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND p.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contact_phones p
 * SET is_primary = false
 * FROM contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE p.contact_id = c.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND p.is_primary = true
 * ```
 */
export const clearPrimaryPhone = new PreparedQuery<IClearPrimaryPhoneParams,IClearPrimaryPhoneResult>(clearPrimaryPhoneIR);


