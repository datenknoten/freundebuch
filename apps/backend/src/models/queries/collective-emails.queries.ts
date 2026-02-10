/** Types generated for queries found in "src/models/queries/collective-emails.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetEmailsByCollectiveId' parameters type */
export interface IGetEmailsByCollectiveIdParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEmailsByCollectiveId' return type */
export interface IGetEmailsByCollectiveIdResult {
  created_at: Date;
  /** The email address */
  email_address: string;
  /** Type of email: personal, work, other */
  email_type: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary email */
  is_primary: boolean;
  /** Custom label for this email */
  label: string | null;
}

/** 'GetEmailsByCollectiveId' query type */
export interface IGetEmailsByCollectiveIdQuery {
  params: IGetEmailsByCollectiveIdParams;
  result: IGetEmailsByCollectiveIdResult;
}

const getEmailsByCollectiveIdIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":279,"b":299}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":323,"b":337}]}],"statement":"SELECT\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at\nFROM collectives.collective_emails e\nINNER JOIN collectives.collectives c ON e.collective_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY e.is_primary DESC, e.created_at ASC"};

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
 * FROM collectives.collective_emails e
 * INNER JOIN collectives.collectives c ON e.collective_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY e.is_primary DESC, e.created_at ASC
 * ```
 */
export const getEmailsByCollectiveId = new PreparedQuery<IGetEmailsByCollectiveIdParams,IGetEmailsByCollectiveIdResult>(getEmailsByCollectiveIdIR);


/** 'GetEmailById' parameters type */
export interface IGetEmailByIdParams {
  collectiveExternalId?: string | null | void;
  emailExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEmailById' return type */
export interface IGetEmailByIdResult {
  created_at: Date;
  /** The email address */
  email_address: string;
  /** Type of email: personal, work, other */
  email_type: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary email */
  is_primary: boolean;
  /** Custom label for this email */
  label: string | null;
}

/** 'GetEmailById' query type */
export interface IGetEmailByIdQuery {
  params: IGetEmailByIdParams;
  result: IGetEmailByIdResult;
}

const getEmailByIdIR: any = {"usedParamSet":{"emailExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":279,"b":294}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":318,"b":338}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":362,"b":376}]}],"statement":"SELECT\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at\nFROM collectives.collective_emails e\nINNER JOIN collectives.collectives c ON e.collective_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.external_id = :emailExternalId\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM collectives.collective_emails e
 * INNER JOIN collectives.collectives c ON e.collective_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.external_id = :emailExternalId
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getEmailById = new PreparedQuery<IGetEmailByIdParams,IGetEmailByIdResult>(getEmailByIdIR);


/** 'CreateEmail' parameters type */
export interface ICreateEmailParams {
  collectiveExternalId?: string | null | void;
  emailAddress?: string | null | void;
  emailType?: string | null | void;
  isPrimary?: boolean | null | void;
  label?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateEmail' return type */
export interface ICreateEmailResult {
  created_at: Date;
  /** The email address */
  email_address: string;
  /** Type of email: personal, work, other */
  email_type: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary email */
  is_primary: boolean;
  /** Custom label for this email */
  label: string | null;
}

/** 'CreateEmail' query type */
export interface ICreateEmailQuery {
  params: ICreateEmailParams;
  result: ICreateEmailResult;
}

const createEmailIR: any = {"usedParamSet":{"emailAddress":true,"emailType":true,"label":true,"isPrimary":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"emailAddress","required":false,"transform":{"type":"scalar"},"locs":[{"a":147,"b":159}]},{"name":"emailType","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":175}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":182,"b":187}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":194,"b":203}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":322}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":346,"b":360}]}],"statement":"INSERT INTO collectives.collective_emails (\n    collective_id,\n    email_address,\n    email_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :emailAddress,\n    :emailType,\n    :label,\n    :isPrimary\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    email_address,\n    email_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO collectives.collective_emails (
 *     collective_id,
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
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId
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
  collectiveExternalId?: string | null | void;
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
  /** The email address */
  email_address: string;
  /** Type of email: personal, work, other */
  email_type: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this is the primary email */
  is_primary: boolean;
  /** Custom label for this email */
  label: string | null;
}

/** 'UpdateEmail' query type */
export interface IUpdateEmailQuery {
  params: IUpdateEmailParams;
  result: IUpdateEmailResult;
}

const updateEmailIR: any = {"usedParamSet":{"emailAddress":true,"emailType":true,"label":true,"isPrimary":true,"emailExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"emailAddress","required":false,"transform":{"type":"scalar"},"locs":[{"a":63,"b":75}]},{"name":"emailType","required":false,"transform":{"type":"scalar"},"locs":[{"a":95,"b":104}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":119,"b":124}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":153}]},{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":267}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":320,"b":340}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":364,"b":378}]}],"statement":"UPDATE collectives.collective_emails e\nSET\n    email_address = :emailAddress,\n    email_type = :emailType,\n    label = :label,\n    is_primary = :isPrimary\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.external_id = :emailExternalId\n  AND e.collective_id = c.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_emails e
 * SET
 *     email_address = :emailAddress,
 *     email_type = :emailType,
 *     label = :label,
 *     is_primary = :isPrimary
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.external_id = :emailExternalId
 *   AND e.collective_id = c.id
 *   AND c.external_id = :collectiveExternalId
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
  collectiveExternalId?: string | null | void;
  emailExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteEmail' return type */
export interface IDeleteEmailResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'DeleteEmail' query type */
export interface IDeleteEmailQuery {
  params: IDeleteEmailParams;
  result: IDeleteEmailResult;
}

const deleteEmailIR: any = {"usedParamSet":{"emailExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":112,"b":127}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":203,"b":223}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":247,"b":261}]}],"statement":"DELETE FROM collectives.collective_emails e\nUSING collectives.collectives c, auth.users u\nWHERE e.external_id = :emailExternalId\n  AND e.collective_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING e.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM collectives.collective_emails e
 * USING collectives.collectives c, auth.users u
 * WHERE e.external_id = :emailExternalId
 *   AND e.collective_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING e.external_id
 * ```
 */
export const deleteEmail = new PreparedQuery<IDeleteEmailParams,IDeleteEmailResult>(deleteEmailIR);


/** 'ClearPrimaryEmail' parameters type */
export interface IClearPrimaryEmailParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryEmail' return type */
export type IClearPrimaryEmailResult = void;

/** 'ClearPrimaryEmail' query type */
export interface IClearPrimaryEmailQuery {
  params: IClearPrimaryEmailParams;
  result: IClearPrimaryEmailResult;
}

const clearPrimaryEmailIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":208}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":232,"b":246}]}],"statement":"UPDATE collectives.collective_emails e\nSET is_primary = false\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.collective_id = c.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND e.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_emails e
 * SET is_primary = false
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.collective_id = c.id
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND e.is_primary = true
 * ```
 */
export const clearPrimaryEmail = new PreparedQuery<IClearPrimaryEmailParams,IClearPrimaryEmailResult>(clearPrimaryEmailIR);


