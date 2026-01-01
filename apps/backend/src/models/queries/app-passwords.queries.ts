/** Types generated for queries found in "src/models/queries/app-passwords.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetAppPasswordsByUserExternalId' parameters type */
export interface IGetAppPasswordsByUserExternalIdParams {
  userExternalId?: string | null | void;
}

/** 'GetAppPasswordsByUserExternalId' return type */
export interface IGetAppPasswordsByUserExternalIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Last time this password was used for authentication */
  last_used_at: Date | null;
  /** User-friendly name (e.g., "My iPhone") */
  name: string;
  /** First 8 chars for quick lookup */
  password_prefix: string;
}

/** 'GetAppPasswordsByUserExternalId' query type */
export interface IGetAppPasswordsByUserExternalIdQuery {
  params: IGetAppPasswordsByUserExternalIdParams;
  result: IGetAppPasswordsByUserExternalIdResult;
}

const getAppPasswordsByUserExternalIdIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":187,"b":201}]}],"statement":"SELECT\n  ap.external_id,\n  ap.name,\n  ap.password_prefix,\n  ap.last_used_at,\n  ap.created_at\nFROM auth.app_passwords ap\nINNER JOIN auth.users u ON ap.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND ap.revoked_at IS NULL\nORDER BY ap.created_at DESC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ap.external_id,
 *   ap.name,
 *   ap.password_prefix,
 *   ap.last_used_at,
 *   ap.created_at
 * FROM auth.app_passwords ap
 * INNER JOIN auth.users u ON ap.user_id = u.id
 * WHERE u.external_id = :userExternalId
 *   AND ap.revoked_at IS NULL
 * ORDER BY ap.created_at DESC
 * ```
 */
export const getAppPasswordsByUserExternalId = new PreparedQuery<IGetAppPasswordsByUserExternalIdParams,IGetAppPasswordsByUserExternalIdResult>(getAppPasswordsByUserExternalIdIR);


/** 'GetAppPasswordsByUserIdAndPrefix' parameters type */
export interface IGetAppPasswordsByUserIdAndPrefixParams {
  prefix?: string | null | void;
  userId?: number | null | void;
}

/** 'GetAppPasswordsByUserIdAndPrefix' return type */
export interface IGetAppPasswordsByUserIdAndPrefixResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** Internal sequential ID (never expose in API) */
  id: number;
  /** bcrypt hash of the app password */
  password_hash: string;
}

/** 'GetAppPasswordsByUserIdAndPrefix' query type */
export interface IGetAppPasswordsByUserIdAndPrefixQuery {
  params: IGetAppPasswordsByUserIdAndPrefixParams;
  result: IGetAppPasswordsByUserIdAndPrefixResult;
}

const getAppPasswordsByUserIdAndPrefixIR: any = {"usedParamSet":{"userId":true,"prefix":true},"params":[{"name":"userId","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":105}]},{"name":"prefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":140}]}],"statement":"SELECT\n  ap.id,\n  ap.external_id,\n  ap.password_hash\nFROM auth.app_passwords ap\nWHERE ap.user_id = :userId\n  AND ap.password_prefix = :prefix\n  AND ap.revoked_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ap.id,
 *   ap.external_id,
 *   ap.password_hash
 * FROM auth.app_passwords ap
 * WHERE ap.user_id = :userId
 *   AND ap.password_prefix = :prefix
 *   AND ap.revoked_at IS NULL
 * ```
 */
export const getAppPasswordsByUserIdAndPrefix = new PreparedQuery<IGetAppPasswordsByUserIdAndPrefixParams,IGetAppPasswordsByUserIdAndPrefixResult>(getAppPasswordsByUserIdAndPrefixIR);


/** 'CreateAppPassword' parameters type */
export interface ICreateAppPasswordParams {
  name?: string | null | void;
  passwordHash?: string | null | void;
  passwordPrefix?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateAppPassword' return type */
export interface ICreateAppPasswordResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-friendly name (e.g., "My iPhone") */
  name: string;
  /** First 8 chars for quick lookup */
  password_prefix: string;
}

/** 'CreateAppPassword' query type */
export interface ICreateAppPasswordQuery {
  params: ICreateAppPasswordParams;
  result: ICreateAppPasswordResult;
}

const createAppPasswordIR: any = {"usedParamSet":{"name":true,"passwordHash":true,"passwordPrefix":true,"userExternalId":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":92,"b":96}]},{"name":"passwordHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":111}]},{"name":"passwordPrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":114,"b":128}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":170,"b":184}]}],"statement":"INSERT INTO auth.app_passwords (user_id, name, password_hash, password_prefix)\nSELECT u.id, :name, :passwordHash, :passwordPrefix\nFROM auth.users u\nWHERE u.external_id = :userExternalId\nRETURNING external_id, name, password_prefix, created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO auth.app_passwords (user_id, name, password_hash, password_prefix)
 * SELECT u.id, :name, :passwordHash, :passwordPrefix
 * FROM auth.users u
 * WHERE u.external_id = :userExternalId
 * RETURNING external_id, name, password_prefix, created_at
 * ```
 */
export const createAppPassword = new PreparedQuery<ICreateAppPasswordParams,ICreateAppPasswordResult>(createAppPasswordIR);


/** 'RevokeAppPassword' parameters type */
export interface IRevokeAppPasswordParams {
  appPasswordExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'RevokeAppPassword' return type */
export interface IRevokeAppPasswordResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'RevokeAppPassword' query type */
export interface IRevokeAppPasswordQuery {
  params: IRevokeAppPasswordParams;
  result: IRevokeAppPasswordResult;
}

const revokeAppPasswordIR: any = {"usedParamSet":{"userExternalId":true,"appPasswordExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":116,"b":130}]},{"name":"appPasswordExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":176}]}],"statement":"UPDATE auth.app_passwords ap\nSET revoked_at = NOW()\nFROM auth.users u\nWHERE ap.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND ap.external_id = :appPasswordExternalId\n  AND ap.revoked_at IS NULL\nRETURNING ap.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.app_passwords ap
 * SET revoked_at = NOW()
 * FROM auth.users u
 * WHERE ap.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND ap.external_id = :appPasswordExternalId
 *   AND ap.revoked_at IS NULL
 * RETURNING ap.external_id
 * ```
 */
export const revokeAppPassword = new PreparedQuery<IRevokeAppPasswordParams,IRevokeAppPasswordResult>(revokeAppPasswordIR);


/** 'UpdateAppPasswordLastUsed' parameters type */
export interface IUpdateAppPasswordLastUsedParams {
  id?: number | null | void;
}

/** 'UpdateAppPasswordLastUsed' return type */
export type IUpdateAppPasswordLastUsedResult = void;

/** 'UpdateAppPasswordLastUsed' query type */
export interface IUpdateAppPasswordLastUsedQuery {
  params: IUpdateAppPasswordLastUsedParams;
  result: IUpdateAppPasswordLastUsedResult;
}

const updateAppPasswordLastUsedIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":62,"b":64}]}],"statement":"UPDATE auth.app_passwords\nSET last_used_at = NOW()\nWHERE id = :id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.app_passwords
 * SET last_used_at = NOW()
 * WHERE id = :id
 * ```
 */
export const updateAppPasswordLastUsed = new PreparedQuery<IUpdateAppPasswordLastUsedParams,IUpdateAppPasswordLastUsedResult>(updateAppPasswordLastUsedIR);


/** 'GetUserByEmailWithInternalId' parameters type */
export interface IGetUserByEmailWithInternalIdParams {
  email?: string | null | void;
}

/** 'GetUserByEmailWithInternalId' return type */
export interface IGetUserByEmailWithInternalIdResult {
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetUserByEmailWithInternalId' query type */
export interface IGetUserByEmailWithInternalIdQuery {
  params: IGetUserByEmailWithInternalIdParams;
  result: IGetUserByEmailWithInternalIdResult;
}

const getUserByEmailWithInternalIdIR: any = {"usedParamSet":{"email":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":76,"b":81}]}],"statement":"SELECT\n  u.id,\n  u.external_id,\n  u.email\nFROM auth.users u\nWHERE u.email = :email"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   u.id,
 *   u.external_id,
 *   u.email
 * FROM auth.users u
 * WHERE u.email = :email
 * ```
 */
export const getUserByEmailWithInternalId = new PreparedQuery<IGetUserByEmailWithInternalIdParams,IGetUserByEmailWithInternalIdResult>(getUserByEmailWithInternalIdIR);


