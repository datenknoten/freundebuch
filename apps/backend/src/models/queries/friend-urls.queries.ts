/** Types generated for queries found in "src/models/queries/friend-urls.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetUrlsByFriendId' parameters type */
export interface IGetUrlsByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetUrlsByFriendId' return type */
export interface IGetUrlsByFriendIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label */
  label: string | null;
  url: string;
  /** personal, work, blog, other */
  url_type: string;
}

/** 'GetUrlsByFriendId' query type */
export interface IGetUrlsByFriendIdQuery {
  params: IGetUrlsByFriendIdParams;
  result: IGetUrlsByFriendIdResult;
}

const getUrlsByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":231,"b":247}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":273,"b":287}]}],"statement":"SELECT\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at\nFROM friends.friend_urls u\nINNER JOIN friends.friends c ON u.friend_id = c.id\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE c.external_id = :friendExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY u.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * FROM friends.friend_urls u
 * INNER JOIN friends.friends c ON u.friend_id = c.id
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE c.external_id = :friendExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY u.created_at ASC
 * ```
 */
export const getUrlsByFriendId = new PreparedQuery<IGetUrlsByFriendIdParams,IGetUrlsByFriendIdResult>(getUrlsByFriendIdIR);


/** 'GetUrlById' parameters type */
export interface IGetUrlByIdParams {
  friendExternalId?: string | null | void;
  urlExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetUrlById' return type */
export interface IGetUrlByIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label */
  label: string | null;
  url: string;
  /** personal, work, blog, other */
  url_type: string;
}

/** 'GetUrlById' query type */
export interface IGetUrlByIdQuery {
  params: IGetUrlByIdParams;
  result: IGetUrlByIdResult;
}

const getUrlByIdIR: any = {"usedParamSet":{"urlExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":231,"b":244}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":268,"b":284}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":310,"b":324}]}],"statement":"SELECT\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at\nFROM friends.friend_urls u\nINNER JOIN friends.friends c ON u.friend_id = c.id\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE u.external_id = :urlExternalId\n  AND c.external_id = :friendExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * FROM friends.friend_urls u
 * INNER JOIN friends.friends c ON u.friend_id = c.id
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE u.external_id = :urlExternalId
 *   AND c.external_id = :friendExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getUrlById = new PreparedQuery<IGetUrlByIdParams,IGetUrlByIdResult>(getUrlByIdIR);


/** 'CreateUrl' parameters type */
export interface ICreateUrlParams {
  friendExternalId?: string | null | void;
  label?: string | null | void;
  url?: string | null | void;
  urlType?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateUrl' return type */
export interface ICreateUrlResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label */
  label: string | null;
  url: string;
  /** personal, work, blog, other */
  url_type: string;
}

/** 'CreateUrl' query type */
export interface ICreateUrlQuery {
  params: ICreateUrlParams;
  result: ICreateUrlResult;
}

const createUrlIR: any = {"usedParamSet":{"url":true,"urlType":true,"label":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"url","required":false,"transform":{"type":"scalar"},"locs":[{"a":105,"b":108}]},{"name":"urlType","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":122}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":129,"b":134}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":245}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":271,"b":285}]}],"statement":"INSERT INTO friends.friend_urls (\n    friend_id,\n    url,\n    url_type,\n    label\n)\nSELECT\n    c.id,\n    :url,\n    :urlType,\n    :label\nFROM friends.friends c\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE c.external_id = :friendExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    url,\n    url_type,\n    label,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_urls (
 *     friend_id,
 *     url,
 *     url_type,
 *     label
 * )
 * SELECT
 *     c.id,
 *     :url,
 *     :urlType,
 *     :label
 * FROM friends.friends c
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE c.external_id = :friendExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     url,
 *     url_type,
 *     label,
 *     created_at
 * ```
 */
export const createUrl = new PreparedQuery<ICreateUrlParams,ICreateUrlResult>(createUrlIR);


/** 'UpdateUrl' parameters type */
export interface IUpdateUrlParams {
  friendExternalId?: string | null | void;
  label?: string | null | void;
  url?: string | null | void;
  urlExternalId?: string | null | void;
  urlType?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateUrl' return type */
export interface IUpdateUrlResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label */
  label: string | null;
  url: string;
  /** personal, work, blog, other */
  url_type: string;
}

/** 'UpdateUrl' query type */
export interface IUpdateUrlQuery {
  params: IUpdateUrlParams;
  result: IUpdateUrlResult;
}

const updateUrlIR: any = {"usedParamSet":{"url":true,"urlType":true,"label":true,"urlExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"url","required":false,"transform":{"type":"scalar"},"locs":[{"a":43,"b":46}]},{"name":"urlType","required":false,"transform":{"type":"scalar"},"locs":[{"a":64,"b":71}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":91}]},{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":186,"b":199}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":248,"b":264}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":290,"b":304}]}],"statement":"UPDATE friends.friend_urls u\nSET\n    url = :url,\n    url_type = :urlType,\n    label = :label\nFROM friends.friends c\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE u.external_id = :urlExternalId\n  AND u.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_urls u
 * SET
 *     url = :url,
 *     url_type = :urlType,
 *     label = :label
 * FROM friends.friends c
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE u.external_id = :urlExternalId
 *   AND u.friend_id = c.id
 *   AND c.external_id = :friendExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * ```
 */
export const updateUrl = new PreparedQuery<IUpdateUrlParams,IUpdateUrlResult>(updateUrlIR);


/** 'DeleteUrl' parameters type */
export interface IDeleteUrlParams {
  friendExternalId?: string | null | void;
  urlExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteUrl' return type */
export interface IDeleteUrlResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteUrl' query type */
export interface IDeleteUrlQuery {
  params: IDeleteUrlParams;
  result: IDeleteUrlResult;
}

const deleteUrlIR: any = {"usedParamSet":{"urlExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":96,"b":109}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":199}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":225,"b":239}]}],"statement":"DELETE FROM friends.friend_urls u\nUSING friends.friends c, auth.users usr\nWHERE u.external_id = :urlExternalId\n  AND u.friend_id = c.id\n  AND c.user_id = usr.id\n  AND c.external_id = :friendExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING u.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_urls u
 * USING friends.friends c, auth.users usr
 * WHERE u.external_id = :urlExternalId
 *   AND u.friend_id = c.id
 *   AND c.user_id = usr.id
 *   AND c.external_id = :friendExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING u.external_id
 * ```
 */
export const deleteUrl = new PreparedQuery<IDeleteUrlParams,IDeleteUrlResult>(deleteUrlIR);


