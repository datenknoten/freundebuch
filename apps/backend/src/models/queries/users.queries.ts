/** Types generated for queries found in "src/models/queries/users.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'GetUserByExternalId' parameters type */
export interface IGetUserByExternalIdParams {
  externalId?: string | null | void;
}

/** 'GetUserByExternalId' return type */
export interface IGetUserByExternalIdResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  updated_at: Date;
}

/** 'GetUserByExternalId' query type */
export interface IGetUserByExternalIdQuery {
  params: IGetUserByExternalIdParams;
  result: IGetUserByExternalIdResult;
}

const getUserByExternalIdIR: any = {"usedParamSet":{"externalId":true},"params":[{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":96}]}],"statement":"SELECT external_id, email, created_at, updated_at\nFROM auth.users\nWHERE external_id = :externalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT external_id, email, created_at, updated_at
 * FROM auth.users
 * WHERE external_id = :externalId
 * ```
 */
export const getUserByExternalId = new PreparedQuery<IGetUserByExternalIdParams,IGetUserByExternalIdResult>(getUserByExternalIdIR);


/** 'GetUserByEmail' parameters type */
export interface IGetUserByEmailParams {
  email?: string | null | void;
}

/** 'GetUserByEmail' return type */
export interface IGetUserByEmailResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  password_hash: string;
  updated_at: Date;
}

/** 'GetUserByEmail' query type */
export interface IGetUserByEmailQuery {
  params: IGetUserByEmailParams;
  result: IGetUserByEmailResult;
}

const getUserByEmailIR: any = {"usedParamSet":{"email":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":95,"b":100}]}],"statement":"SELECT external_id, email, password_hash, created_at, updated_at\nFROM auth.users\nWHERE email = :email"};

/**
 * Query generated from SQL:
 * ```
 * SELECT external_id, email, password_hash, created_at, updated_at
 * FROM auth.users
 * WHERE email = :email
 * ```
 */
export const getUserByEmail = new PreparedQuery<IGetUserByEmailParams,IGetUserByEmailResult>(getUserByEmailIR);


/** 'GetUserByEmailWithSelfProfile' parameters type */
export interface IGetUserByEmailWithSelfProfileParams {
  email?: string | null | void;
}

/** 'GetUserByEmailWithSelfProfile' return type */
export interface IGetUserByEmailWithSelfProfileResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Public UUID for API exposure (always use this in APIs) */
  self_profile_external_id: string;
  updated_at: Date;
}

/** 'GetUserByEmailWithSelfProfile' query type */
export interface IGetUserByEmailWithSelfProfileQuery {
  params: IGetUserByEmailWithSelfProfileParams;
  result: IGetUserByEmailWithSelfProfileResult;
}

const getUserByEmailWithSelfProfileIR: any = {"usedParamSet":{"email":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":236,"b":241}]}],"statement":"SELECT\n    u.external_id,\n    u.email,\n    u.created_at,\n    u.updated_at,\n    c.external_id as self_profile_external_id\nFROM auth.users u\nLEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL\nWHERE u.email = :email"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.email,
 *     u.created_at,
 *     u.updated_at,
 *     c.external_id as self_profile_external_id
 * FROM auth.users u
 * LEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL
 * WHERE u.email = :email
 * ```
 */
export const getUserByEmailWithSelfProfile = new PreparedQuery<IGetUserByEmailWithSelfProfileParams,IGetUserByEmailWithSelfProfileResult>(getUserByEmailWithSelfProfileIR);


/** 'CreateUser' parameters type */
export interface ICreateUserParams {
  email?: string | null | void;
  passwordHash?: string | null | void;
}

/** 'CreateUser' return type */
export interface ICreateUserResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  updated_at: Date;
}

/** 'CreateUser' query type */
export interface ICreateUserQuery {
  params: ICreateUserParams;
  result: ICreateUserResult;
}

const createUserIR: any = {"usedParamSet":{"email":true,"passwordHash":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":54,"b":59}]},{"name":"passwordHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":62,"b":74}]}],"statement":"INSERT INTO auth.users (email, password_hash)\nVALUES (:email, :passwordHash)\nRETURNING external_id, email, created_at, updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO auth.users (email, password_hash)
 * VALUES (:email, :passwordHash)
 * RETURNING external_id, email, created_at, updated_at
 * ```
 */
export const createUser = new PreparedQuery<ICreateUserParams,ICreateUserResult>(createUserIR);


/** 'UpdateUser' parameters type */
export interface IUpdateUserParams {
  email?: string | null | void;
  externalId?: string | null | void;
}

/** 'UpdateUser' return type */
export interface IUpdateUserResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  updated_at: Date;
}

/** 'UpdateUser' query type */
export interface IUpdateUserQuery {
  params: IUpdateUserParams;
  result: IUpdateUserResult;
}

const updateUserIR: any = {"usedParamSet":{"email":true,"externalId":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":30,"b":35}]},{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":89,"b":99}]}],"statement":"UPDATE auth.users\nSET email = :email, updated_at = CURRENT_TIMESTAMP\nWHERE external_id = :externalId\nRETURNING external_id, email, created_at, updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.users
 * SET email = :email, updated_at = CURRENT_TIMESTAMP
 * WHERE external_id = :externalId
 * RETURNING external_id, email, created_at, updated_at
 * ```
 */
export const updateUser = new PreparedQuery<IUpdateUserParams,IUpdateUserResult>(updateUserIR);


/** 'UpdateUserReturningWithSelfProfile' parameters type */
export interface IUpdateUserReturningWithSelfProfileParams {
  email?: string | null | void;
  externalId?: string | null | void;
}

/** 'UpdateUserReturningWithSelfProfile' return type */
export interface IUpdateUserReturningWithSelfProfileResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  self_profile_external_id: string | null;
  updated_at: Date;
}

/** 'UpdateUserReturningWithSelfProfile' query type */
export interface IUpdateUserReturningWithSelfProfileQuery {
  params: IUpdateUserReturningWithSelfProfileParams;
  result: IUpdateUserReturningWithSelfProfileResult;
}

const updateUserReturningWithSelfProfileIR: any = {"usedParamSet":{"email":true,"externalId":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":32,"b":37}]},{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":103}]}],"statement":"UPDATE auth.users u\nSET email = :email, updated_at = CURRENT_TIMESTAMP\nWHERE u.external_id = :externalId\nRETURNING\n    u.external_id,\n    u.email,\n    u.created_at,\n    u.updated_at,\n    (SELECT c.external_id FROM friends.friends c WHERE c.id = u.self_profile_id AND c.deleted_at IS NULL) as self_profile_external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.users u
 * SET email = :email, updated_at = CURRENT_TIMESTAMP
 * WHERE u.external_id = :externalId
 * RETURNING
 *     u.external_id,
 *     u.email,
 *     u.created_at,
 *     u.updated_at,
 *     (SELECT c.external_id FROM friends.friends c WHERE c.id = u.self_profile_id AND c.deleted_at IS NULL) as self_profile_external_id
 * ```
 */
export const updateUserReturningWithSelfProfile = new PreparedQuery<IUpdateUserReturningWithSelfProfileParams,IUpdateUserReturningWithSelfProfileResult>(updateUserReturningWithSelfProfileIR);


/** 'DeleteUser' parameters type */
export interface IDeleteUserParams {
  externalId?: string | null | void;
}

/** 'DeleteUser' return type */
export type IDeleteUserResult = void;

/** 'DeleteUser' query type */
export interface IDeleteUserQuery {
  params: IDeleteUserParams;
  result: IDeleteUserResult;
}

const deleteUserIR: any = {"usedParamSet":{"externalId":true},"params":[{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":43,"b":53}]}],"statement":"DELETE FROM auth.users\nWHERE external_id = :externalId"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM auth.users
 * WHERE external_id = :externalId
 * ```
 */
export const deleteUser = new PreparedQuery<IDeleteUserParams,IDeleteUserResult>(deleteUserIR);


/** 'UpdateUserPassword' parameters type */
export interface IUpdateUserPasswordParams {
  externalId?: string | null | void;
  passwordHash?: string | null | void;
}

/** 'UpdateUserPassword' return type */
export interface IUpdateUserPasswordResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  updated_at: Date;
}

/** 'UpdateUserPassword' query type */
export interface IUpdateUserPasswordQuery {
  params: IUpdateUserPasswordParams;
  result: IUpdateUserPasswordResult;
}

const updateUserPasswordIR: any = {"usedParamSet":{"passwordHash":true,"externalId":true},"params":[{"name":"passwordHash","required":false,"transform":{"type":"scalar"},"locs":[{"a":38,"b":50}]},{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":108,"b":118}]}],"statement":"UPDATE auth.users\nSET password_hash = :passwordHash,\n    updated_at = CURRENT_TIMESTAMP\nWHERE external_id = :externalId\nRETURNING external_id, email, created_at, updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.users
 * SET password_hash = :passwordHash,
 *     updated_at = CURRENT_TIMESTAMP
 * WHERE external_id = :externalId
 * RETURNING external_id, email, created_at, updated_at
 * ```
 */
export const updateUserPassword = new PreparedQuery<IUpdateUserPasswordParams,IUpdateUserPasswordResult>(updateUserPasswordIR);


/** 'GetUserWithPreferences' parameters type */
export interface IGetUserWithPreferencesParams {
  externalId?: string | null | void;
}

/** 'GetUserWithPreferences' return type */
export interface IGetUserWithPreferencesResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** User preferences stored as JSONB. Structure: { contactsPageSize?: 10 | 25 | 50 | 100 } */
  preferences: Json;
  updated_at: Date;
}

/** 'GetUserWithPreferences' query type */
export interface IGetUserWithPreferencesQuery {
  params: IGetUserWithPreferencesParams;
  result: IGetUserWithPreferencesResult;
}

const getUserWithPreferencesIR: any = {"usedParamSet":{"externalId":true},"params":[{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":109}]}],"statement":"SELECT external_id, email, preferences, created_at, updated_at\nFROM auth.users\nWHERE external_id = :externalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT external_id, email, preferences, created_at, updated_at
 * FROM auth.users
 * WHERE external_id = :externalId
 * ```
 */
export const getUserWithPreferences = new PreparedQuery<IGetUserWithPreferencesParams,IGetUserWithPreferencesResult>(getUserWithPreferencesIR);


/** 'UpdateUserPreferences' parameters type */
export interface IUpdateUserPreferencesParams {
  externalId?: string | null | void;
  preferences?: Json | null | void;
}

/** 'UpdateUserPreferences' return type */
export interface IUpdateUserPreferencesResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** User preferences stored as JSONB. Structure: { contactsPageSize?: 10 | 25 | 50 | 100 } */
  preferences: Json;
  updated_at: Date;
}

/** 'UpdateUserPreferences' query type */
export interface IUpdateUserPreferencesQuery {
  params: IUpdateUserPreferencesParams;
  result: IUpdateUserPreferencesResult;
}

const updateUserPreferencesIR: any = {"usedParamSet":{"preferences":true,"externalId":true},"params":[{"name":"preferences","required":false,"transform":{"type":"scalar"},"locs":[{"a":36,"b":47}]},{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":105,"b":115}]}],"statement":"UPDATE auth.users\nSET preferences = :preferences,\n    updated_at = CURRENT_TIMESTAMP\nWHERE external_id = :externalId\nRETURNING external_id, email, preferences, created_at, updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.users
 * SET preferences = :preferences,
 *     updated_at = CURRENT_TIMESTAMP
 * WHERE external_id = :externalId
 * RETURNING external_id, email, preferences, created_at, updated_at
 * ```
 */
export const updateUserPreferences = new PreparedQuery<IUpdateUserPreferencesParams,IUpdateUserPreferencesResult>(updateUserPreferencesIR);


/** 'GetUserSelfProfile' parameters type */
export interface IGetUserSelfProfileParams {
  userExternalId?: string | null | void;
}

/** 'GetUserSelfProfile' return type */
export interface IGetUserSelfProfileResult {
  /** Public UUID for API exposure (always use this in APIs) */
  self_profile_external_id: string;
  /** Reference to the user's profile (first friendbook entry) */
  self_profile_id: number | null;
}

/** 'GetUserSelfProfile' query type */
export interface IGetUserSelfProfileQuery {
  params: IGetUserSelfProfileParams;
  result: IGetUserSelfProfileResult;
}

const getUserSelfProfileIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":197,"b":211}]}],"statement":"SELECT\n    u.self_profile_id,\n    c.external_id as self_profile_external_id\nFROM auth.users u\nLEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL\nWHERE u.external_id = :userExternalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.self_profile_id,
 *     c.external_id as self_profile_external_id
 * FROM auth.users u
 * LEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL
 * WHERE u.external_id = :userExternalId
 * ```
 */
export const getUserSelfProfile = new PreparedQuery<IGetUserSelfProfileParams,IGetUserSelfProfileResult>(getUserSelfProfileIR);


/** 'SetUserSelfProfile' parameters type */
export interface ISetUserSelfProfileParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SetUserSelfProfile' return type */
export interface ISetUserSelfProfileResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Public UUID for API exposure (always use this in APIs) */
  self_profile_external_id: string;
}

/** 'SetUserSelfProfile' query type */
export interface ISetUserSelfProfileQuery {
  params: ISetUserSelfProfileParams;
  result: ISetUserSelfProfileResult;
}

const setUserSelfProfileIR: any = {"usedParamSet":{"userExternalId":true,"friendExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":128,"b":142}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":182}]}],"statement":"UPDATE auth.users u\nSET self_profile_id = c.id,\n    updated_at = CURRENT_TIMESTAMP\nFROM friends.friends c\nWHERE u.external_id = :userExternalId\n  AND c.external_id = :friendExternalId\n  AND c.user_id = u.id\n  AND c.deleted_at IS NULL\nRETURNING u.external_id, c.external_id as self_profile_external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.users u
 * SET self_profile_id = c.id,
 *     updated_at = CURRENT_TIMESTAMP
 * FROM friends.friends c
 * WHERE u.external_id = :userExternalId
 *   AND c.external_id = :friendExternalId
 *   AND c.user_id = u.id
 *   AND c.deleted_at IS NULL
 * RETURNING u.external_id, c.external_id as self_profile_external_id
 * ```
 */
export const setUserSelfProfile = new PreparedQuery<ISetUserSelfProfileParams,ISetUserSelfProfileResult>(setUserSelfProfileIR);


/** 'HasSelfProfile' parameters type */
export interface IHasSelfProfileParams {
  userExternalId?: string | null | void;
}

/** 'HasSelfProfile' return type */
export interface IHasSelfProfileResult {
  has_self_profile: boolean | null;
}

/** 'HasSelfProfile' query type */
export interface IHasSelfProfileQuery {
  params: IHasSelfProfileParams;
  result: IHasSelfProfileResult;
}

const hasSelfProfileIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":230,"b":244}]}],"statement":"SELECT\n    CASE WHEN u.self_profile_id IS NOT NULL\n         AND c.deleted_at IS NULL\n    THEN true ELSE false END as has_self_profile\nFROM auth.users u\nLEFT JOIN friends.friends c ON u.self_profile_id = c.id\nWHERE u.external_id = :userExternalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     CASE WHEN u.self_profile_id IS NOT NULL
 *          AND c.deleted_at IS NULL
 *     THEN true ELSE false END as has_self_profile
 * FROM auth.users u
 * LEFT JOIN friends.friends c ON u.self_profile_id = c.id
 * WHERE u.external_id = :userExternalId
 * ```
 */
export const hasSelfProfile = new PreparedQuery<IHasSelfProfileParams,IHasSelfProfileResult>(hasSelfProfileIR);


