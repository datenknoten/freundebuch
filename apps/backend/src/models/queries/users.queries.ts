/** Types generated for queries found in "src/models/queries/users.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'GetUserWithSelfProfile' parameters type */
export interface IGetUserWithSelfProfileParams {
  userExternalId?: string | null | void;
}

/** 'GetUserWithSelfProfile' return type */
export interface IGetUserWithSelfProfileResult {
  created_at: Date;
  email: string;
  /** UUID primary key (mapped from legacy external_id) */
  external_id: string;
  /** Primary name shown in lists */
  self_profile_display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  self_profile_external_id: string;
  updated_at: Date;
}

/** 'GetUserWithSelfProfile' query type */
export interface IGetUserWithSelfProfileQuery {
  params: IGetUserWithSelfProfileParams;
  result: IGetUserWithSelfProfileResult;
}

const getUserWithSelfProfileIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":289,"b":303}]}],"statement":"SELECT\n    u.id as external_id,\n    u.email,\n    u.created_at,\n    u.updated_at,\n    c.external_id as self_profile_external_id,\n    c.display_name as self_profile_display_name\nFROM auth.\"user\" u\nLEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL\nWHERE u.id = :userExternalId"};

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
 * WHERE u.id = :userExternalId
 * ```
 */
export const getUserWithSelfProfile = new PreparedQuery<IGetUserWithSelfProfileParams,IGetUserWithSelfProfileResult>(getUserWithSelfProfileIR);


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
  preferences: Json;
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
  preferences: Json;
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
  /** User preferences (page size, birthday format, language, etc.) */
  preferences: Json;
  /** Primary name shown in lists */
  self_profile_display_name: string;
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

const getUserSelfProfileIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":400,"b":414}]}],"statement":"SELECT\n    u.self_profile_id,\n    -- Read fresh, not from the session: the Better Auth cookie cache holds a\n    -- 5-minute-old copy of both columns (see GET /api/auth/me).\n    u.preferences,\n    c.external_id as self_profile_external_id,\n    c.display_name as self_profile_display_name\nFROM auth.\"user\" u\nLEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL\nWHERE u.id = :userExternalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.self_profile_id,
 *     -- Read fresh, not from the session: the Better Auth cookie cache holds a
 *     -- 5-minute-old copy of both columns (see GET /api/auth/me).
 *     u.preferences,
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

const setUserSelfProfileIR: any = {"usedParamSet":{"userExternalId":true,"friendExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":147,"b":161}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":228,"b":244}]}],"statement":"UPDATE auth.\"user\" ba_u\nSET self_profile_id = c.id,\n    updated_at = CURRENT_TIMESTAMP\nFROM friends.friends c, auth.users legacy_u\nWHERE ba_u.id = :userExternalId\n  AND legacy_u.external_id::text = ba_u.id\n  AND c.external_id = :friendExternalId\n  AND c.user_id = legacy_u.id\n  AND c.deleted_at IS NULL\nRETURNING ba_u.id as external_id, c.external_id as self_profile_external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth."user" ba_u
 * SET self_profile_id = c.id,
 *     updated_at = CURRENT_TIMESTAMP
 * FROM friends.friends c, auth.users legacy_u
 * WHERE ba_u.id = :userExternalId
 *   AND legacy_u.external_id::text = ba_u.id
 *   AND c.external_id = :friendExternalId
 *   AND c.user_id = legacy_u.id
 *   AND c.deleted_at IS NULL
 * RETURNING ba_u.id as external_id, c.external_id as self_profile_external_id
 * ```
 */
export const setUserSelfProfile = new PreparedQuery<ISetUserSelfProfileParams,ISetUserSelfProfileResult>(setUserSelfProfileIR);


/** 'DeleteOrphanLegacyUsers' parameters type */
export type IDeleteOrphanLegacyUsersParams = void;

/** 'DeleteOrphanLegacyUsers' return type */
export interface IDeleteOrphanLegacyUsersResult {
  deleted_count: number | null;
}

/** 'DeleteOrphanLegacyUsers' query type */
export interface IDeleteOrphanLegacyUsersQuery {
  params: IDeleteOrphanLegacyUsersParams;
  result: IDeleteOrphanLegacyUsersResult;
}

const deleteOrphanLegacyUsersIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT auth.delete_orphan_legacy_users() as deleted_count"};

/**
 * Query generated from SQL:
 * ```
 * SELECT auth.delete_orphan_legacy_users() as deleted_count
 * ```
 */
export const deleteOrphanLegacyUsers = new PreparedQuery<IDeleteOrphanLegacyUsersParams,IDeleteOrphanLegacyUsersResult>(deleteOrphanLegacyUsersIR);


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


