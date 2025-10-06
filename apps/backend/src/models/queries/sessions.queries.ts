/** Types generated for queries found in "src/models/queries/sessions.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

/** 'GetSessionByToken' parameters type */
export interface IGetSessionByTokenParams {
  tokenHash?: string | null | void;
}

/** 'GetSessionByToken' return type */
export interface IGetSessionByTokenResult {
  created_at: Date;
  expires_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Public UUID for API exposure (always use this in APIs) */
  user_external_id: string;
}

/** 'GetSessionByToken' query type */
export interface IGetSessionByTokenQuery {
  params: IGetSessionByTokenParams;
  result: IGetSessionByTokenResult;
}

const getSessionByTokenIR: any = {"usedParamSet":{"tokenHash":true},"params":[{"name":"tokenHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":164,"b":173}]}],"statement":"SELECT s.external_id, u.external_id as user_external_id, s.expires_at, s.created_at\nFROM auth.sessions s\nJOIN auth.users u ON s.user_id = u.id\nWHERE s.token_hash = :tokenHash AND s.expires_at > CURRENT_TIMESTAMP"};

/**
 * Query generated from SQL:
 * ```
 * SELECT s.external_id, u.external_id as user_external_id, s.expires_at, s.created_at
 * FROM auth.sessions s
 * JOIN auth.users u ON s.user_id = u.id
 * WHERE s.token_hash = :tokenHash AND s.expires_at > CURRENT_TIMESTAMP
 * ```
 */
export const getSessionByToken = new PreparedQuery<IGetSessionByTokenParams,IGetSessionByTokenResult>(getSessionByTokenIR);


/** 'CreateSession' parameters type */
export interface ICreateSessionParams {
  expiresAt?: DateOrString | null | void;
  tokenHash?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateSession' return type */
export interface ICreateSessionResult {
  created_at: Date;
  expires_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'CreateSession' query type */
export interface ICreateSessionQuery {
  params: ICreateSessionParams;
  result: ICreateSessionResult;
}

const createSessionIR: any = {"usedParamSet":{"userExternalId":true,"tokenHash":true,"expiresAt":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":132}]},{"name":"tokenHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":138,"b":147}]},{"name":"expiresAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":161}]}],"statement":"INSERT INTO auth.sessions (user_id, token_hash, expires_at)\nVALUES (\n  (SELECT id FROM auth.users WHERE external_id = :userExternalId),\n  :tokenHash,\n  :expiresAt\n)\nRETURNING external_id, expires_at, created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO auth.sessions (user_id, token_hash, expires_at)
 * VALUES (
 *   (SELECT id FROM auth.users WHERE external_id = :userExternalId),
 *   :tokenHash,
 *   :expiresAt
 * )
 * RETURNING external_id, expires_at, created_at
 * ```
 */
export const createSession = new PreparedQuery<ICreateSessionParams,ICreateSessionResult>(createSessionIR);


/** 'DeleteSessionByToken' parameters type */
export interface IDeleteSessionByTokenParams {
  tokenHash?: string | null | void;
}

/** 'DeleteSessionByToken' return type */
export type IDeleteSessionByTokenResult = void;

/** 'DeleteSessionByToken' query type */
export interface IDeleteSessionByTokenQuery {
  params: IDeleteSessionByTokenParams;
  result: IDeleteSessionByTokenResult;
}

const deleteSessionByTokenIR: any = {"usedParamSet":{"tokenHash":true},"params":[{"name":"tokenHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":45,"b":54}]}],"statement":"DELETE FROM auth.sessions\nWHERE token_hash = :tokenHash"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM auth.sessions
 * WHERE token_hash = :tokenHash
 * ```
 */
export const deleteSessionByToken = new PreparedQuery<IDeleteSessionByTokenParams,IDeleteSessionByTokenResult>(deleteSessionByTokenIR);


/** 'DeleteSessionByExternalId' parameters type */
export interface IDeleteSessionByExternalIdParams {
  externalId?: string | null | void;
}

/** 'DeleteSessionByExternalId' return type */
export type IDeleteSessionByExternalIdResult = void;

/** 'DeleteSessionByExternalId' query type */
export interface IDeleteSessionByExternalIdQuery {
  params: IDeleteSessionByExternalIdParams;
  result: IDeleteSessionByExternalIdResult;
}

const deleteSessionByExternalIdIR: any = {"usedParamSet":{"externalId":true},"params":[{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":46,"b":56}]}],"statement":"DELETE FROM auth.sessions\nWHERE external_id = :externalId"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM auth.sessions
 * WHERE external_id = :externalId
 * ```
 */
export const deleteSessionByExternalId = new PreparedQuery<IDeleteSessionByExternalIdParams,IDeleteSessionByExternalIdResult>(deleteSessionByExternalIdIR);


/** 'DeleteExpiredSessions' parameters type */
export type IDeleteExpiredSessionsParams = void;

/** 'DeleteExpiredSessions' return type */
export type IDeleteExpiredSessionsResult = void;

/** 'DeleteExpiredSessions' query type */
export interface IDeleteExpiredSessionsQuery {
  params: IDeleteExpiredSessionsParams;
  result: IDeleteExpiredSessionsResult;
}

const deleteExpiredSessionsIR: any = {"usedParamSet":{},"params":[],"statement":"DELETE FROM auth.sessions\nWHERE expires_at <= CURRENT_TIMESTAMP"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM auth.sessions
 * WHERE expires_at <= CURRENT_TIMESTAMP
 * ```
 */
export const deleteExpiredSessions = new PreparedQuery<IDeleteExpiredSessionsParams,IDeleteExpiredSessionsResult>(deleteExpiredSessionsIR);


/** 'DeleteUserSessions' parameters type */
export interface IDeleteUserSessionsParams {
  userExternalId?: string | null | void;
}

/** 'DeleteUserSessions' return type */
export type IDeleteUserSessionsResult = void;

/** 'DeleteUserSessions' query type */
export interface IDeleteUserSessionsQuery {
  params: IDeleteUserSessionsParams;
  result: IDeleteUserSessionsResult;
}

const deleteUserSessionsIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":89,"b":103}]}],"statement":"DELETE FROM auth.sessions\nWHERE user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId)"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM auth.sessions
 * WHERE user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId)
 * ```
 */
export const deleteUserSessions = new PreparedQuery<IDeleteUserSessionsParams,IDeleteUserSessionsResult>(deleteUserSessionsIR);


