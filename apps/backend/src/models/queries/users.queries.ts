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


/** 'GetUserByEmailWithSelfContact' parameters type */
export interface IGetUserByEmailWithSelfContactParams {
  email?: string | null | void;
}

/** 'GetUserByEmailWithSelfContact' return type */
export interface IGetUserByEmailWithSelfContactResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Public UUID for API exposure (always use this in APIs) */
  self_contact_external_id: string;
  updated_at: Date;
}

/** 'GetUserByEmailWithSelfContact' query type */
export interface IGetUserByEmailWithSelfContactQuery {
  params: IGetUserByEmailWithSelfContactParams;
  result: IGetUserByEmailWithSelfContactResult;
}

const getUserByEmailWithSelfContactIR: any = {"usedParamSet":{"email":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":238,"b":243}]}],"statement":"SELECT\n    u.external_id,\n    u.email,\n    u.created_at,\n    u.updated_at,\n    c.external_id as self_contact_external_id\nFROM auth.users u\nLEFT JOIN contacts.contacts c ON u.self_contact_id = c.id AND c.deleted_at IS NULL\nWHERE u.email = :email"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.email,
 *     u.created_at,
 *     u.updated_at,
 *     c.external_id as self_contact_external_id
 * FROM auth.users u
 * LEFT JOIN contacts.contacts c ON u.self_contact_id = c.id AND c.deleted_at IS NULL
 * WHERE u.email = :email
 * ```
 */
export const getUserByEmailWithSelfContact = new PreparedQuery<IGetUserByEmailWithSelfContactParams,IGetUserByEmailWithSelfContactResult>(getUserByEmailWithSelfContactIR);


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


/** 'UpdateUserReturningWithSelfContact' parameters type */
export interface IUpdateUserReturningWithSelfContactParams {
  email?: string | null | void;
  externalId?: string | null | void;
}

/** 'UpdateUserReturningWithSelfContact' return type */
export interface IUpdateUserReturningWithSelfContactResult {
  created_at: Date;
  email: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  self_contact_external_id: string | null;
  updated_at: Date;
}

/** 'UpdateUserReturningWithSelfContact' query type */
export interface IUpdateUserReturningWithSelfContactQuery {
  params: IUpdateUserReturningWithSelfContactParams;
  result: IUpdateUserReturningWithSelfContactResult;
}

const updateUserReturningWithSelfContactIR: any = {"usedParamSet":{"email":true,"externalId":true},"params":[{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":32,"b":37}]},{"name":"externalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":103}]}],"statement":"UPDATE auth.users u\nSET email = :email, updated_at = CURRENT_TIMESTAMP\nWHERE u.external_id = :externalId\nRETURNING\n    u.external_id,\n    u.email,\n    u.created_at,\n    u.updated_at,\n    (SELECT c.external_id FROM contacts.contacts c WHERE c.id = u.self_contact_id AND c.deleted_at IS NULL) as self_contact_external_id"};

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
 *     (SELECT c.external_id FROM contacts.contacts c WHERE c.id = u.self_contact_id AND c.deleted_at IS NULL) as self_contact_external_id
 * ```
 */
export const updateUserReturningWithSelfContact = new PreparedQuery<IUpdateUserReturningWithSelfContactParams,IUpdateUserReturningWithSelfContactResult>(updateUserReturningWithSelfContactIR);


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


/** 'GetUserSelfContact' parameters type */
export interface IGetUserSelfContactParams {
  userExternalId?: string | null | void;
}

/** 'GetUserSelfContact' return type */
export interface IGetUserSelfContactResult {
  /** Public UUID for API exposure (always use this in APIs) */
  self_contact_external_id: string;
  /** Reference to the user's self-contact (first friendbook entry) */
  self_contact_id: number | null;
}

/** 'GetUserSelfContact' query type */
export interface IGetUserSelfContactQuery {
  params: IGetUserSelfContactParams;
  result: IGetUserSelfContactResult;
}

const getUserSelfContactIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":199,"b":213}]}],"statement":"SELECT\n    u.self_contact_id,\n    c.external_id as self_contact_external_id\nFROM auth.users u\nLEFT JOIN contacts.contacts c ON u.self_contact_id = c.id AND c.deleted_at IS NULL\nWHERE u.external_id = :userExternalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.self_contact_id,
 *     c.external_id as self_contact_external_id
 * FROM auth.users u
 * LEFT JOIN contacts.contacts c ON u.self_contact_id = c.id AND c.deleted_at IS NULL
 * WHERE u.external_id = :userExternalId
 * ```
 */
export const getUserSelfContact = new PreparedQuery<IGetUserSelfContactParams,IGetUserSelfContactResult>(getUserSelfContactIR);


/** 'SetUserSelfContact' parameters type */
export interface ISetUserSelfContactParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SetUserSelfContact' return type */
export interface ISetUserSelfContactResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Public UUID for API exposure (always use this in APIs) */
  self_contact_external_id: string;
}

/** 'SetUserSelfContact' query type */
export interface ISetUserSelfContactQuery {
  params: ISetUserSelfContactParams;
  result: ISetUserSelfContactResult;
}

const setUserSelfContactIR: any = {"usedParamSet":{"userExternalId":true,"contactExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":130,"b":144}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":185}]}],"statement":"UPDATE auth.users u\nSET self_contact_id = c.id,\n    updated_at = CURRENT_TIMESTAMP\nFROM contacts.contacts c\nWHERE u.external_id = :userExternalId\n  AND c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND c.deleted_at IS NULL\nRETURNING u.external_id, c.external_id as self_contact_external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE auth.users u
 * SET self_contact_id = c.id,
 *     updated_at = CURRENT_TIMESTAMP
 * FROM contacts.contacts c
 * WHERE u.external_id = :userExternalId
 *   AND c.external_id = :contactExternalId
 *   AND c.user_id = u.id
 *   AND c.deleted_at IS NULL
 * RETURNING u.external_id, c.external_id as self_contact_external_id
 * ```
 */
export const setUserSelfContact = new PreparedQuery<ISetUserSelfContactParams,ISetUserSelfContactResult>(setUserSelfContactIR);


/** 'HasSelfContact' parameters type */
export interface IHasSelfContactParams {
  userExternalId?: string | null | void;
}

/** 'HasSelfContact' return type */
export interface IHasSelfContactResult {
  has_self_contact: boolean | null;
}

/** 'HasSelfContact' query type */
export interface IHasSelfContactQuery {
  params: IHasSelfContactParams;
  result: IHasSelfContactResult;
}

const hasSelfContactIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":232,"b":246}]}],"statement":"SELECT\n    CASE WHEN u.self_contact_id IS NOT NULL\n         AND c.deleted_at IS NULL\n    THEN true ELSE false END as has_self_contact\nFROM auth.users u\nLEFT JOIN contacts.contacts c ON u.self_contact_id = c.id\nWHERE u.external_id = :userExternalId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     CASE WHEN u.self_contact_id IS NOT NULL
 *          AND c.deleted_at IS NULL
 *     THEN true ELSE false END as has_self_contact
 * FROM auth.users u
 * LEFT JOIN contacts.contacts c ON u.self_contact_id = c.id
 * WHERE u.external_id = :userExternalId
 * ```
 */
export const hasSelfContact = new PreparedQuery<IHasSelfContactParams,IHasSelfContactResult>(hasSelfContactIR);


