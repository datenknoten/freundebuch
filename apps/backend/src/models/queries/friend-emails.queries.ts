/** Types generated for queries found in "src/models/queries/friend-emails.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetEmailsByFriendId' parameters type */
export interface IGetEmailsByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEmailsByFriendId' return type */
export interface IGetEmailsByFriendIdResult {
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

/** 'GetEmailsByFriendId' query type */
export interface IGetEmailsByFriendIdQuery {
  params: IGetEmailsByFriendIdParams;
  result: IGetEmailsByFriendIdResult;
}

const getEmailsByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":275}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":299,"b":313}]}],"statement":"SELECT\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at\nFROM friends.friend_emails e\nINNER JOIN friends.friends c ON e.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY e.is_primary DESC, e.created_at ASC"};

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
 * FROM friends.friend_emails e
 * INNER JOIN friends.friends c ON e.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY e.is_primary DESC, e.created_at ASC
 * ```
 */
export const getEmailsByFriendId = new PreparedQuery<IGetEmailsByFriendIdParams,IGetEmailsByFriendIdResult>(getEmailsByFriendIdIR);


/** 'GetEmailById' parameters type */
export interface IGetEmailByIdParams {
  emailExternalId?: string | null | void;
  friendExternalId?: string | null | void;
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

const getEmailByIdIR: any = {"usedParamSet":{"emailExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":274}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":314}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":352}]}],"statement":"SELECT\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at\nFROM friends.friend_emails e\nINNER JOIN friends.friends c ON e.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.external_id = :emailExternalId\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM friends.friend_emails e
 * INNER JOIN friends.friends c ON e.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.external_id = :emailExternalId
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getEmailById = new PreparedQuery<IGetEmailByIdParams,IGetEmailByIdResult>(getEmailByIdIR);


/** 'CreateEmail' parameters type */
export interface ICreateEmailParams {
  emailAddress?: string | null | void;
  emailType?: string | null | void;
  friendExternalId?: string | null | void;
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

const createEmailIR: any = {"usedParamSet":{"emailAddress":true,"emailType":true,"label":true,"isPrimary":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"emailAddress","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":147}]},{"name":"emailType","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":163}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":170,"b":175}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":182,"b":191}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":282,"b":298}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":322,"b":336}]}],"statement":"INSERT INTO friends.friend_emails (\n    friend_id,\n    email_address,\n    email_type,\n    label,\n    is_primary\n)\nSELECT\n    c.id,\n    :emailAddress,\n    :emailType,\n    :label,\n    :isPrimary\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    email_address,\n    email_type,\n    label,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_emails (
 *     friend_id,
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
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
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
  emailAddress?: string | null | void;
  emailExternalId?: string | null | void;
  emailType?: string | null | void;
  friendExternalId?: string | null | void;
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

const updateEmailIR: any = {"usedParamSet":{"emailAddress":true,"emailType":true,"label":true,"isPrimary":true,"emailExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"emailAddress","required":false,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]},{"name":"emailType","required":false,"transform":{"type":"scalar"},"locs":[{"a":87,"b":96}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":111,"b":116}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":136,"b":145}]},{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":236,"b":251}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":300,"b":316}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":340,"b":354}]}],"statement":"UPDATE friends.friend_emails e\nSET\n    email_address = :emailAddress,\n    email_type = :emailType,\n    label = :label,\n    is_primary = :isPrimary\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.external_id = :emailExternalId\n  AND e.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    e.external_id,\n    e.email_address,\n    e.email_type,\n    e.label,\n    e.is_primary,\n    e.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_emails e
 * SET
 *     email_address = :emailAddress,
 *     email_type = :emailType,
 *     label = :label,
 *     is_primary = :isPrimary
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.external_id = :emailExternalId
 *   AND e.friend_id = c.id
 *   AND c.external_id = :friendExternalId
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
  emailExternalId?: string | null | void;
  friendExternalId?: string | null | void;
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

const deleteEmailIR: any = {"usedParamSet":{"emailExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"emailExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":96,"b":111}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":199}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":223,"b":237}]}],"statement":"DELETE FROM friends.friend_emails e\nUSING friends.friends c, auth.users u\nWHERE e.external_id = :emailExternalId\n  AND e.friend_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING e.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_emails e
 * USING friends.friends c, auth.users u
 * WHERE e.external_id = :emailExternalId
 *   AND e.friend_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING e.external_id
 * ```
 */
export const deleteEmail = new PreparedQuery<IDeleteEmailParams,IDeleteEmailResult>(deleteEmailIR);


/** 'ClearPrimaryEmail' parameters type */
export interface IClearPrimaryEmailParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryEmail' return type */
export type IClearPrimaryEmailResult = void;

/** 'ClearPrimaryEmail' query type */
export interface IClearPrimaryEmailQuery {
  params: IClearPrimaryEmailParams;
  result: IClearPrimaryEmailResult;
}

const clearPrimaryEmailIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":184}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":208,"b":222}]}],"statement":"UPDATE friends.friend_emails e\nSET is_primary = false\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE e.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND e.is_primary = true"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_emails e
 * SET is_primary = false
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE e.friend_id = c.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND e.is_primary = true
 * ```
 */
export const clearPrimaryEmail = new PreparedQuery<IClearPrimaryEmailParams,IClearPrimaryEmailResult>(clearPrimaryEmailIR);


