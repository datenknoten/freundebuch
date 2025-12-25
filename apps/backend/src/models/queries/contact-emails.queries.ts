/** Types generated for queries found in "src/models/queries/contact-emails.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetEmailsByContactId' parameters type */
export interface IGetEmailsByContactIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEmailsByContactId' return type */
export interface IGetEmailsByContactIdResult {
  created_at: Date;
  email_address: string;
  /** personal, work, other */
  email_type: string;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
}

/** 'GetEmailsByContactId' query type */
export interface IGetEmailsByContactIdQuery {
  params: IGetEmailsByContactIdParams;
  result: IGetEmailsByContactIdResult;
}

const getEmailsByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":264,"b":281}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":305,"b":319}]}],"statement":"SELECT\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at\nFROM contacts.contact_emails e\nINNER JOIN contacts.contacts c ON e.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY e.is_primary DESC, e.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     e.external_id,
 *     e.email_address,
 *     e.email_type,
 *     e.label,
 *     e.is_primary,
 *     e.created_at
 * FROM contacts.contact_emails e
 * INNER JOIN contacts.contacts c ON e.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY e.is_primary DESC, e.created_at ASC
 * ```
 */
export const getEmailsByContactId = new PreparedQuery<IGetEmailsByContactIdParams,IGetEmailsByContactIdResult>(getEmailsByContactIdIR);


/** 'GetEmailById' parameters type */
export interface IGetEmailByIdParams {
  contactExternalId?: string | null | void;
  emailExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEmailById' return type */
export interface IGetEmailByIdResult {
  created_at: Date;
  email_address: string;
  /** personal, work, other */
  email_type: string;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
}

/** 'GetEmailById' query type */
export interface IGetEmailByIdQuery {
  params: IGetEmailByIdParams;
  result: IGetEmailByIdResult;
}

const getEmailByIdIR: any = {"usedParamSet":{"emailExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":264,"b":279}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":303,"b":320}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":344,"b":358}]}],"statement":"SELECT\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at\nFROM contacts.contact_emails e\nINNER JOIN contacts.contacts c ON e.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.external_id = :emailExternalId\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     e.external_id,
 *     e.email_address,
 *     e.email_type,
 *     e.label,
 *     e.is_primary,
 *     e.created_at
 * FROM contacts.contact_emails e
 * INNER JOIN contacts.contacts c ON e.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.external_id = :emailExternalId
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getEmailById = new PreparedQuery<IGetEmailByIdParams,IGetEmailByIdResult>(getEmailByIdIR);


/** 'CreateEmail' parameters type */
export interface ICreateEmailParams {
  contactExternalId?: string | null | void;
  emailAddress?: string | null | void;
  emailType?: string | null | void;
  isPrimary?: boolean | null | void;
  label?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateEmail' return type */
export interface ICreateEmailResult {
  created_at: Date;
  email_address: string;
  /** personal, work, other */
  email_type: string;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
}

/** 'CreateEmail' query type */
export interface ICreateEmailQuery {
  params: ICreateEmailParams;
  result: ICreateEmailResult;
}

const createEmailIR: any = {"usedParamSet":{"emailAddress":true,"emailType":true,"label":true,"isPrimary":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"emailAddress","required":false,"transform":{"type":"scalar"},"locs":[{"a":138,"b":150}]},{"name":"emailType","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":166}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":173,"b":178}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":185,"b":194}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":287,"b":304}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":328,"b":342}]}],"statement":"INSERT INTO contacts.contact_emails (\n    contact_id,\n    email_address,\n    email_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :emailAddress,\n    :emailType,\n    :label,\n    :isPrimary\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    email_address,\n    email_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_emails (
 *     contact_id,
 *     email_address,
 *     email_type,
 *     label,
 *     is_primary
 * )
 * SELECT
 *     c.id,
 *     :emailAddress,
 *     :emailType,
 *     :label,
 *     :isPrimary
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     email_address,
 *     email_type,
 *     label,
 *     is_primary,
 *     created_at
 * ```
 */
export const createEmail = new PreparedQuery<ICreateEmailParams,ICreateEmailResult>(createEmailIR);


/** 'UpdateEmail' parameters type */
export interface IUpdateEmailParams {
  contactExternalId?: string | null | void;
  emailAddress?: string | null | void;
  emailExternalId?: string | null | void;
  emailType?: string | null | void;
  isPrimary?: boolean | null | void;
  label?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateEmail' return type */
export interface IUpdateEmailResult {
  created_at: Date;
  email_address: string;
  /** personal, work, other */
  email_type: string;
  /** Public UUID for API exposure */
  external_id: string;
  is_primary: boolean;
  /** User-defined label */
  label: string | null;
}

/** 'UpdateEmail' query type */
export interface IUpdateEmailQuery {
  params: IUpdateEmailParams;
  result: IUpdateEmailResult;
}

const updateEmailIR: any = {"usedParamSet":{"emailAddress":true,"emailType":true,"label":true,"isPrimary":true,"emailExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"emailAddress","required":false,"transform":{"type":"scalar"},"locs":[{"a":57,"b":69}]},{"name":"emailType","required":false,"transform":{"type":"scalar"},"locs":[{"a":89,"b":98}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":113,"b":118}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":138,"b":147}]},{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":240,"b":255}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":305,"b":322}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":346,"b":360}]}],"statement":"UPDATE contacts.contact_emails e\nSET\n    email_address = :emailAddress,\n    email_type = :emailType,\n    label = :label,\n    is_primary = :isPrimary\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.external_id = :emailExternalId\n  AND e.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_emails e
 * SET
 *     email_address = :emailAddress,
 *     email_type = :emailType,
 *     label = :label,
 *     is_primary = :isPrimary
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.external_id = :emailExternalId
 *   AND e.contact_id = c.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     e.external_id,
 *     e.email_address,
 *     e.email_type,
 *     e.label,
 *     e.is_primary,
 *     e.created_at
 * ```
 */
export const updateEmail = new PreparedQuery<IUpdateEmailParams,IUpdateEmailResult>(updateEmailIR);


/** 'DeleteEmail' parameters type */
export interface IDeleteEmailParams {
  contactExternalId?: string | null | void;
  emailExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteEmail' return type */
export interface IDeleteEmailResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteEmail' query type */
export interface IDeleteEmailQuery {
  params: IDeleteEmailParams;
  result: IDeleteEmailResult;
}

const deleteEmailIR: any = {"usedParamSet":{"emailExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":100,"b":115}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":205}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":243}]}],"statement":"DELETE FROM contacts.contact_emails e\nUSING contacts.contacts c, auth.users u\nWHERE e.external_id = :emailExternalId\n  AND e.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING e.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_emails e
 * USING contacts.contacts c, auth.users u
 * WHERE e.external_id = :emailExternalId
 *   AND e.contact_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING e.external_id
 * ```
 */
export const deleteEmail = new PreparedQuery<IDeleteEmailParams,IDeleteEmailResult>(deleteEmailIR);


/** 'ClearPrimaryEmail' parameters type */
export interface IClearPrimaryEmailParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryEmail' return type */
export type IClearPrimaryEmailResult = void;

/** 'ClearPrimaryEmail' query type */
export interface IClearPrimaryEmailQuery {
  params: IClearPrimaryEmailParams;
  result: IClearPrimaryEmailResult;
}

const clearPrimaryEmailIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":173,"b":190}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":214,"b":228}]}],"statement":"UPDATE contacts.contact_emails e\nSET is_primary = false\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND e.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_emails e
 * SET is_primary = false
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.contact_id = c.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND e.is_primary = true
 * ```
 */
export const clearPrimaryEmail = new PreparedQuery<IClearPrimaryEmailParams,IClearPrimaryEmailResult>(clearPrimaryEmailIR);


