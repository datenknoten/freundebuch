/** Types generated for queries found in "src/models/queries/password-reset-tokens.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

/** 'CreatePasswordResetToken' parameters type */
export interface ICreatePasswordResetTokenParams {
  expiresAt?: DateOrString | null | void;
  tokenHash?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreatePasswordResetToken' return type */
export interface ICreatePasswordResetTokenResult {
  created_at: Date;
  /** Token expiration time (typically 1 hour) */
  expires_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'CreatePasswordResetToken' query type */
export interface ICreatePasswordResetTokenQuery {
  params: ICreatePasswordResetTokenParams;
  result: ICreatePasswordResetTokenResult;
}

const createPasswordResetTokenIR: any = {"usedParamSet":{"userExternalId":true,"tokenHash":true,"expiresAt":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":145}]},{"name":"tokenHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":151,"b":160}]},{"name":"expiresAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":165,"b":174}]}],"statement":"INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at)\nVALUES (\n  (SELECT id FROM auth.users WHERE external_id = :userExternalId),\n  :tokenHash,\n  :expiresAt\n)\nRETURNING external_id, expires_at, created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at)
 * VALUES (
 *   (SELECT id FROM auth.users WHERE external_id = :userExternalId),
 *   :tokenHash,
 *   :expiresAt
 * )
 * RETURNING external_id, expires_at, created_at
 * ```
 */
export const createPasswordResetToken = new PreparedQuery<ICreatePasswordResetTokenParams,ICreatePasswordResetTokenResult>(createPasswordResetTokenIR);


/** 'GetPasswordResetToken' parameters type */
export interface IGetPasswordResetTokenParams {
  tokenHash?: string | null | void;
}

/** 'GetPasswordResetToken' return type */
export interface IGetPasswordResetTokenResult {
  created_at: Date;
  /** Token expiration time (typically 1 hour) */
  expires_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** When the token was used (null if unused) */
  used_at: Date | null;
  /** Public UUID for API exposure (always use this in APIs) */
  user_external_id: string;
}

/** 'GetPasswordResetToken' query type */
export interface IGetPasswordResetTokenQuery {
  params: IGetPasswordResetTokenParams;
  result: IGetPasswordResetTokenResult;
}

const getPasswordResetTokenIR: any = {"usedParamSet":{"tokenHash":true},"params":[{"name":"tokenHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":212,"b":221}]}],"statement":"SELECT\n  prt.external_id,\n  u.external_id as user_external_id,\n  prt.expires_at,\n  prt.used_at,\n  prt.created_at\nFROM auth.password_reset_tokens prt\nJOIN auth.users u ON prt.user_id = u.id\nWHERE prt.token_hash = :tokenHash\n  AND prt.expires_at > CURRENT_TIMESTAMP\n  AND prt.used_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   prt.external_id,
 *   u.external_id as user_external_id,
 *   prt.expires_at,
 *   prt.used_at,
 *   prt.created_at
 * FROM auth.password_reset_tokens prt
 * JOIN auth.users u ON prt.user_id = u.id
 * WHERE prt.token_hash = :tokenHash
 *   AND prt.expires_at > CURRENT_TIMESTAMP
 *   AND prt.used_at IS NULL
 * ```
 */
export const getPasswordResetToken = new PreparedQuery<IGetPasswordResetTokenParams,IGetPasswordResetTokenResult>(getPasswordResetTokenIR);


/** 'MarkPasswordResetTokenAsUsed' parameters type */
export interface IMarkPasswordResetTokenAsUsedParams {
  tokenHash?: string | null | void;
}

/** 'MarkPasswordResetTokenAsUsed' return type */
export interface IMarkPasswordResetTokenAsUsedResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** When the token was used (null if unused) */
  used_at: Date | null;
}

/** 'MarkPasswordResetTokenAsUsed' query type */
export interface IMarkPasswordResetTokenAsUsedQuery {
  params: IMarkPasswordResetTokenAsUsedParams;
  result: IMarkPasswordResetTokenAsUsedResult;
}

const markPasswordResetTokenAsUsedIR: any = {"usedParamSet":{"tokenHash":true},"params":[{"name":"tokenHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":85,"b":94}]}],"statement":"UPDATE auth.password_reset_tokens\nSET used_at = CURRENT_TIMESTAMP\nWHERE token_hash = :tokenHash\nRETURNING external_id, used_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.password_reset_tokens
 * SET used_at = CURRENT_TIMESTAMP
 * WHERE token_hash = :tokenHash
 * RETURNING external_id, used_at
 * ```
 */
export const markPasswordResetTokenAsUsed = new PreparedQuery<IMarkPasswordResetTokenAsUsedParams,IMarkPasswordResetTokenAsUsedResult>(markPasswordResetTokenAsUsedIR);


/** 'DeleteExpiredPasswordResetTokens' parameters type */
export type IDeleteExpiredPasswordResetTokensParams = void;

/** 'DeleteExpiredPasswordResetTokens' return type */
export type IDeleteExpiredPasswordResetTokensResult = void;

/** 'DeleteExpiredPasswordResetTokens' query type */
export interface IDeleteExpiredPasswordResetTokensQuery {
  params: IDeleteExpiredPasswordResetTokensParams;
  result: IDeleteExpiredPasswordResetTokensResult;
}

const deleteExpiredPasswordResetTokensIR: any = {"usedParamSet":{},"params":[],"statement":"DELETE FROM auth.password_reset_tokens\nWHERE expires_at <= CURRENT_TIMESTAMP OR used_at IS NOT NULL"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM auth.password_reset_tokens
 * WHERE expires_at <= CURRENT_TIMESTAMP OR used_at IS NOT NULL
 * ```
 */
export const deleteExpiredPasswordResetTokens = new PreparedQuery<IDeleteExpiredPasswordResetTokensParams,IDeleteExpiredPasswordResetTokensResult>(deleteExpiredPasswordResetTokensIR);


/** 'DeleteUserPasswordResetTokens' parameters type */
export interface IDeleteUserPasswordResetTokensParams {
  userExternalId?: string | null | void;
}

/** 'DeleteUserPasswordResetTokens' return type */
export type IDeleteUserPasswordResetTokensResult = void;

/** 'DeleteUserPasswordResetTokens' query type */
export interface IDeleteUserPasswordResetTokensQuery {
  params: IDeleteUserPasswordResetTokensParams;
  result: IDeleteUserPasswordResetTokensResult;
}

const deleteUserPasswordResetTokensIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":102,"b":116}]}],"statement":"DELETE FROM auth.password_reset_tokens\nWHERE user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId)"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM auth.password_reset_tokens
 * WHERE user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId)
 * ```
 */
export const deleteUserPasswordResetTokens = new PreparedQuery<IDeleteUserPasswordResetTokensParams,IDeleteUserPasswordResetTokensResult>(deleteUserPasswordResetTokensIR);


