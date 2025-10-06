/** Types generated for queries found in "src/models/queries/users.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

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


