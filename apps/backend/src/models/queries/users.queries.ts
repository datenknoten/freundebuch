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


/** 'GetUserByEmailWithSelfProfile' parameters type */
export interface IGetUserByEmailWithSelfProfileParams {
  email?: string | null | void;
}

/** 'GetUserByEmailWithSelfProfile' return type */
export interface IGetUserByEmailWithSelfProfileResult {
  created_at: Date;
  email: string;
  /** UUID primary key (mapped from legacy external_id) */
  external_id: string;
  /** Display name of the self-profile friend */
  self_profile_display_name: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  self_profile_external_id: string;
  updated_at: Date;
}

/** 'GetUserByEmailWithSelfProfile' query type */
export interface IGetUserByEmailWithSelfProfileQuery {
  params: IGetUserByEmailWithSelfProfileParams;
  result: IGetUserByEmailWithSelfProfileResult;
}

const getUserByEmailWithSelfProfileIR: any = {"usedParamSet":{"email":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":297}]}],"statement":"SELECT\n    u.id as external_id,\n    u.email,\n    u.created_at,\n    u.updated_at,\n    c.external_id as self_profile_external_id,\n    c.display_name as self_profile_display_name\nFROM auth.\"user\" u\nLEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL\nWHERE u.email = :email"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.id as external_id,
 *     u.email,
 *     u.created_at,
 *     u.updated_at,
 *     c.external_id as self_profile_external_id,
 *     c.display_name as self_profile_display_name
 * FROM auth."user" u
 * LEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL
 * WHERE u.email = :email
 * ```
 */
export const getUserByEmailWithSelfProfile = new PreparedQuery<IGetUserByEmailWithSelfProfileParams,IGetUserByEmailWithSelfProfileResult>(getUserByEmailWithSelfProfileIR);


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
  self_profile_display_name: string | null;
  self_profile_external_id: string | null;
  updated_at: Date;
}

/** 'UpdateUserReturningWithSelfProfile' query type */
export interface IUpdateUserReturningWithSelfProfileQuery {
  params: IUpdateUserReturningWithSelfProfileParams;
  result: IUpdateUserReturningWithSelfProfileResult;
}

const updateUserReturningWithSelfProfileIR: any = {"usedParamSet":{"email":true,"externalId":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":32,"b":37}]},{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":103}]}],"statement":"UPDATE auth.users u\nSET email = :email, updated_at = CURRENT_TIMESTAMP\nWHERE u.external_id = :externalId\nRETURNING\n    u.external_id,\n    u.email,\n    u.created_at,\n    u.updated_at,\n    (SELECT c.external_id FROM friends.friends c WHERE c.id = u.self_profile_id AND c.deleted_at IS NULL) as self_profile_external_id,\n    (SELECT c.display_name FROM friends.friends c WHERE c.id = u.self_profile_id AND c.deleted_at IS NULL) as self_profile_display_name"};

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
 *     (SELECT c.external_id FROM friends.friends c WHERE c.id = u.self_profile_id AND c.deleted_at IS NULL) as self_profile_external_id,
 *     (SELECT c.display_name FROM friends.friends c WHERE c.id = u.self_profile_id AND c.deleted_at IS NULL) as self_profile_display_name
 * ```
 */
export const updateUserReturningWithSelfProfile = new PreparedQuery<IUpdateUserReturningWithSelfProfileParams,IUpdateUserReturningWithSelfProfileResult>(updateUserReturningWithSelfProfileIR);


/** 'GetUserWithPreferences' parameters type */
export interface IGetUserWithPreferencesParams {
  externalId?: string | null | void;
}

/** 'GetUserWithPreferences' return type */
export interface IGetUserWithPreferencesResult {
  created_at: Date;
  email: string;
  /** UUID primary key (mapped from legacy external_id) */
  external_id: string;
  /** User preferences (page size, birthday format, language, etc.) */
  preferences: Json | null;
  updated_at: Date;
}

/** 'GetUserWithPreferences' query type */
export interface IGetUserWithPreferencesQuery {
  params: IGetUserWithPreferencesParams;
  result: IGetUserWithPreferencesResult;
}

const getUserWithPreferencesIR: any = {"usedParamSet":{"externalId":true},"params":[{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":97,"b":107}]}],"statement":"SELECT id as external_id, email, preferences, created_at, updated_at\nFROM auth.\"user\"\nWHERE id = :externalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id as external_id, email, preferences, created_at, updated_at
 * FROM auth."user"
 * WHERE id = :externalId
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
  /** UUID primary key (mapped from legacy external_id) */
  external_id: string;
  /** User preferences (page size, birthday format, language, etc.) */
  preferences: Json | null;
  updated_at: Date;
}

/** 'UpdateUserPreferences' query type */
export interface IUpdateUserPreferencesQuery {
  params: IUpdateUserPreferencesParams;
  result: IUpdateUserPreferencesResult;
}

const updateUserPreferencesIR: any = {"usedParamSet":{"preferences":true,"externalId":true},"params":[{"name":"preferences","required":false,"transform":{"type":"scalar"},"locs":[{"a":37,"b":48}]},{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":97,"b":107}]}],"statement":"UPDATE auth.\"user\"\nSET preferences = :preferences,\n    updated_at = CURRENT_TIMESTAMP\nWHERE id = :externalId\nRETURNING id as external_id, email, preferences, created_at, updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth."user"
 * SET preferences = :preferences,
 *     updated_at = CURRENT_TIMESTAMP
 * WHERE id = :externalId
 * RETURNING id as external_id, email, preferences, created_at, updated_at
 * ```
 */
export const updateUserPreferences = new PreparedQuery<IUpdateUserPreferencesParams,IUpdateUserPreferencesResult>(updateUserPreferencesIR);


/** 'GetUserSelfProfile' parameters type */
export interface IGetUserSelfProfileParams {
  userExternalId?: string | null | void;
}

/** 'GetUserSelfProfile' return type */
export interface IGetUserSelfProfileResult {
  /** Display name of the self-profile friend */
  self_profile_display_name: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  self_profile_external_id: string;
  /** FK to friends.friends - set during onboarding */
  self_profile_id: number | null;
}

/** 'GetUserSelfProfile' query type */
export interface IGetUserSelfProfileQuery {
  params: IGetUserSelfProfileParams;
  result: IGetUserSelfProfileResult;
}

const getUserSelfProfileIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":238,"b":252}]}],"statement":"SELECT\n    u.self_profile_id,\n    c.external_id as self_profile_external_id,\n    c.display_name as self_profile_display_name\nFROM auth.\"user\" u\nLEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL\nWHERE u.id = :userExternalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.self_profile_id,
 *     c.external_id as self_profile_external_id,
 *     c.display_name as self_profile_display_name
 * FROM auth."user" u
 * LEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL
 * WHERE u.id = :userExternalId
 * ```
 */
export const getUserSelfProfile = new PreparedQuery<IGetUserSelfProfileParams,IGetUserSelfProfileResult>(getUserSelfProfileIR);


/** 'GetSelfProfileExternalId' parameters type */
export interface IGetSelfProfileExternalIdParams {
  selfProfileId?: number | null | void;
}

/** 'GetSelfProfileExternalId' return type */
export interface IGetSelfProfileExternalIdResult {
  /** Public UUID for API exposure (always use this in APIs) */
  self_profile_external_id: string;
}

/** 'GetSelfProfileExternalId' query type */
export interface IGetSelfProfileExternalIdQuery {
  params: IGetSelfProfileExternalIdParams;
  result: IGetSelfProfileExternalIdResult;
}

const getSelfProfileExternalIdIR: any = {"usedParamSet":{"selfProfileId":true},"params":[{"name":"selfProfileId","required":false,"transform":{"type":"scalar"},"locs":[{"a":79,"b":92}]}],"statement":"SELECT external_id as self_profile_external_id\nFROM friends.friends\nWHERE id = :selfProfileId AND deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT external_id as self_profile_external_id
 * FROM friends.friends
 * WHERE id = :selfProfileId AND deleted_at IS NULL
 * ```
 */
export const getSelfProfileExternalId = new PreparedQuery<IGetSelfProfileExternalIdParams,IGetSelfProfileExternalIdResult>(getSelfProfileExternalIdIR);


/** 'SetUserSelfProfile' parameters type */
export interface ISetUserSelfProfileParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SetUserSelfProfile' return type */
export interface ISetUserSelfProfileResult {
  /** UUID primary key (mapped from legacy external_id) */
  external_id: string;
  /** Public UUID for API exposure (always use this in APIs) */
  self_profile_external_id: string;
}

/** 'SetUserSelfProfile' query type */
export interface ISetUserSelfProfileQuery {
  params: ISetUserSelfProfileParams;
  result: ISetUserSelfProfileResult;
}

const setUserSelfProfileIR: any = {"usedParamSet":{"userExternalId":true,"friendExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":147,"b":161}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":219,"b":235}]}],"statement":"UPDATE auth.\"user\" ba_u\nSET self_profile_id = c.id,\n    updated_at = CURRENT_TIMESTAMP\nFROM friends.friends c, auth.users legacy_u\nWHERE ba_u.id = :userExternalId\n  AND legacy_u.email = ba_u.email\n  AND c.external_id = :friendExternalId\n  AND c.user_id = legacy_u.id\n  AND c.deleted_at IS NULL\nRETURNING ba_u.id as external_id, c.external_id as self_profile_external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth."user" ba_u
 * SET self_profile_id = c.id,
 *     updated_at = CURRENT_TIMESTAMP
 * FROM friends.friends c, auth.users legacy_u
 * WHERE ba_u.id = :userExternalId
 *   AND legacy_u.email = ba_u.email
 *   AND c.external_id = :friendExternalId
 *   AND c.user_id = legacy_u.id
 *   AND c.deleted_at IS NULL
 * RETURNING ba_u.id as external_id, c.external_id as self_profile_external_id
 * ```
 */
export const setUserSelfProfile = new PreparedQuery<ISetUserSelfProfileParams,ISetUserSelfProfileResult>(setUserSelfProfileIR);


/** 'GetLegacyExternalIdByEmail' parameters type */
export interface IGetLegacyExternalIdByEmailParams {
  email?: string | null | void;
}

/** 'GetLegacyExternalIdByEmail' return type */
export interface IGetLegacyExternalIdByEmailResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'GetLegacyExternalIdByEmail' query type */
export interface IGetLegacyExternalIdByEmailQuery {
  params: IGetLegacyExternalIdByEmailParams;
  result: IGetLegacyExternalIdByEmailResult;
}

const getLegacyExternalIdByEmailIR: any = {"usedParamSet":{"email":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":49,"b":54}]}],"statement":"SELECT external_id FROM auth.users WHERE email = :email"};

/**
 * Query generated from SQL:
 * ```
 * SELECT external_id FROM auth.users WHERE email = :email
 * ```
 */
export const getLegacyExternalIdByEmail = new PreparedQuery<IGetLegacyExternalIdByEmailParams,IGetLegacyExternalIdByEmailResult>(getLegacyExternalIdByEmailIR);


/** 'CreateLegacyUserForBetterAuth' parameters type */
export interface ICreateLegacyUserForBetterAuthParams {
  email?: string | null | void;
}

/** 'CreateLegacyUserForBetterAuth' return type */
export type ICreateLegacyUserForBetterAuthResult = void;

/** 'CreateLegacyUserForBetterAuth' query type */
export interface ICreateLegacyUserForBetterAuthQuery {
  params: ICreateLegacyUserForBetterAuthParams;
  result: ICreateLegacyUserForBetterAuthResult;
}

const createLegacyUserForBetterAuthIR: any = {"usedParamSet":{"email":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":54,"b":59}]}],"statement":"INSERT INTO auth.users (email, password_hash)\nVALUES (:email, '')\nON CONFLICT (email) DO NOTHING"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO auth.users (email, password_hash)
 * VALUES (:email, '')
 * ON CONFLICT (email) DO NOTHING
 * ```
 */
export const createLegacyUserForBetterAuth = new PreparedQuery<ICreateLegacyUserForBetterAuthParams,ICreateLegacyUserForBetterAuthResult>(createLegacyUserForBetterAuthIR);


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

const hasSelfProfileIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":222,"b":236}]}],"statement":"SELECT\n    CASE WHEN u.self_profile_id IS NOT NULL\n         AND c.deleted_at IS NULL\n    THEN true ELSE false END as has_self_profile\nFROM auth.\"user\" u\nLEFT JOIN friends.friends c ON u.self_profile_id = c.id\nWHERE u.id = :userExternalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     CASE WHEN u.self_profile_id IS NOT NULL
 *          AND c.deleted_at IS NULL
 *     THEN true ELSE false END as has_self_profile
 * FROM auth."user" u
 * LEFT JOIN friends.friends c ON u.self_profile_id = c.id
 * WHERE u.id = :userExternalId
 * ```
 */
export const hasSelfProfile = new PreparedQuery<IHasSelfProfileParams,IHasSelfProfileResult>(hasSelfProfileIR);


