/** Types generated for queries found in "src/models/queries/friend-met-info.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

/** 'GetMetInfoByFriendId' parameters type */
export interface IGetMetInfoByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetMetInfoByFriendId' return type */
export interface IGetMetInfoByFriendIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Context/circumstances of meeting */
  met_context: string | null;
  /** Date when you met this person */
  met_date: Date | null;
  /** Location where you met */
  met_location: string | null;
  updated_at: Date;
}

/** 'GetMetInfoByFriendId' query type */
export interface IGetMetInfoByFriendIdQuery {
  params: IGetMetInfoByFriendIdParams;
  result: IGetMetInfoByFriendIdResult;
}

const getMetInfoByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":264,"b":280}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":304,"b":318}]}],"statement":"SELECT\n    m.external_id,\n    m.met_date,\n    m.met_location,\n    m.met_context,\n    m.created_at,\n    m.updated_at\nFROM friends.friend_met_info m\nINNER JOIN friends.friends c ON m.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     m.external_id,
 *     m.met_date,
 *     m.met_location,
 *     m.met_context,
 *     m.created_at,
 *     m.updated_at
 * FROM friends.friend_met_info m
 * INNER JOIN friends.friends c ON m.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getMetInfoByFriendId = new PreparedQuery<IGetMetInfoByFriendIdParams,IGetMetInfoByFriendIdResult>(getMetInfoByFriendIdIR);


/** 'UpsertMetInfo' parameters type */
export interface IUpsertMetInfoParams {
  friendExternalId?: string | null | void;
  metContext?: string | null | void;
  metDate?: DateOrString | null | void;
  metLocation?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpsertMetInfo' return type */
export interface IUpsertMetInfoResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Context/circumstances of meeting */
  met_context: string | null;
  /** Date when you met this person */
  met_date: Date | null;
  /** Location where you met */
  met_location: string | null;
  updated_at: Date;
}

/** 'UpsertMetInfo' query type */
export interface IUpsertMetInfoQuery {
  params: IUpsertMetInfoParams;
  result: IUpsertMetInfoResult;
}

const upsertMetInfoIR: any = {"usedParamSet":{"metDate":true,"metLocation":true,"metContext":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"metDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":124,"b":131},{"a":399,"b":406}]},{"name":"metLocation","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":155},{"a":434,"b":445}]},{"name":"metContext","required":false,"transform":{"type":"scalar"},"locs":[{"a":162,"b":172},{"a":466,"b":476}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":263,"b":279}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":303,"b":317}]}],"statement":"INSERT INTO friends.friend_met_info (\n    friend_id,\n    met_date,\n    met_location,\n    met_context\n)\nSELECT\n    c.id,\n    :metDate::date,\n    :metLocation,\n    :metContext\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nON CONFLICT (friend_id)\nDO UPDATE SET\n    met_date = :metDate::date,\n    met_location = :metLocation,\n    met_context = :metContext,\n    updated_at = CURRENT_TIMESTAMP\nRETURNING\n    external_id,\n    met_date,\n    met_location,\n    met_context,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_met_info (
 *     friend_id,
 *     met_date,
 *     met_location,
 *     met_context
 * )
 * SELECT
 *     c.id,
 *     :metDate::date,
 *     :metLocation,
 *     :metContext
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ON CONFLICT (friend_id)
 * DO UPDATE SET
 *     met_date = :metDate::date,
 *     met_location = :metLocation,
 *     met_context = :metContext,
 *     updated_at = CURRENT_TIMESTAMP
 * RETURNING
 *     external_id,
 *     met_date,
 *     met_location,
 *     met_context,
 *     created_at,
 *     updated_at
 * ```
 */
export const upsertMetInfo = new PreparedQuery<IUpsertMetInfoParams,IUpsertMetInfoResult>(upsertMetInfoIR);


/** 'DeleteMetInfo' parameters type */
export interface IDeleteMetInfoParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteMetInfo' return type */
export interface IDeleteMetInfoResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteMetInfo' query type */
export interface IDeleteMetInfoQuery {
  params: IDeleteMetInfoParams;
  result: IDeleteMetInfoResult;
}

const deleteMetInfoIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":146,"b":162}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":186,"b":200}]}],"statement":"DELETE FROM friends.friend_met_info m\nUSING friends.friends c, auth.users u\nWHERE m.friend_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING m.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_met_info m
 * USING friends.friends c, auth.users u
 * WHERE m.friend_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING m.external_id
 * ```
 */
export const deleteMetInfo = new PreparedQuery<IDeleteMetInfoParams,IDeleteMetInfoResult>(deleteMetInfoIR);


