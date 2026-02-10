/** Types generated for queries found in "src/models/queries/collective-urls.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetUrlsByCollectiveId' parameters type */
export interface IGetUrlsByCollectiveIdParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetUrlsByCollectiveId' return type */
export interface IGetUrlsByCollectiveIdResult {
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Custom label for this URL */
  label: string | null;
  /** The URL */
  url: string;
  /** Type of URL: personal, work, blog, other */
  url_type: string;
}

/** 'GetUrlsByCollectiveId' query type */
export interface IGetUrlsByCollectiveIdQuery {
  params: IGetUrlsByCollectiveIdParams;
  result: IGetUrlsByCollectiveIdResult;
}

const getUrlsByCollectiveIdIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":251,"b":271}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":297,"b":311}]}],"statement":"SELECT\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at\nFROM collectives.collective_urls u\nINNER JOIN collectives.collectives c ON u.collective_id = c.id\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE c.external_id = :collectiveExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY u.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * FROM collectives.collective_urls u
 * INNER JOIN collectives.collectives c ON u.collective_id = c.id
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE c.external_id = :collectiveExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY u.created_at ASC
 * ```
 */
export const getUrlsByCollectiveId = new PreparedQuery<IGetUrlsByCollectiveIdParams,IGetUrlsByCollectiveIdResult>(getUrlsByCollectiveIdIR);


/** 'GetUrlById' parameters type */
export interface IGetUrlByIdParams {
  collectiveExternalId?: string | null | void;
  urlExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetUrlById' return type */
export interface IGetUrlByIdResult {
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Custom label for this URL */
  label: string | null;
  /** The URL */
  url: string;
  /** Type of URL: personal, work, blog, other */
  url_type: string;
}

/** 'GetUrlById' query type */
export interface IGetUrlByIdQuery {
  params: IGetUrlByIdParams;
  result: IGetUrlByIdResult;
}

const getUrlByIdIR: any = {"usedParamSet":{"urlExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":251,"b":264}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":308}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":334,"b":348}]}],"statement":"SELECT\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at\nFROM collectives.collective_urls u\nINNER JOIN collectives.collectives c ON u.collective_id = c.id\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE u.external_id = :urlExternalId\n  AND c.external_id = :collectiveExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * FROM collectives.collective_urls u
 * INNER JOIN collectives.collectives c ON u.collective_id = c.id
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE u.external_id = :urlExternalId
 *   AND c.external_id = :collectiveExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getUrlById = new PreparedQuery<IGetUrlByIdParams,IGetUrlByIdResult>(getUrlByIdIR);


/** 'CreateUrl' parameters type */
export interface ICreateUrlParams {
  collectiveExternalId?: string | null | void;
  label?: string | null | void;
  url?: string | null | void;
  urlType?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateUrl' return type */
export interface ICreateUrlResult {
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Custom label for this URL */
  label: string | null;
  /** The URL */
  url: string;
  /** Type of URL: personal, work, blog, other */
  url_type: string;
}

/** 'CreateUrl' query type */
export interface ICreateUrlQuery {
  params: ICreateUrlParams;
  result: ICreateUrlResult;
}

const createUrlIR: any = {"usedParamSet":{"url":true,"urlType":true,"label":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"url","required":false,"transform":{"type":"scalar"},"locs":[{"a":117,"b":120}]},{"name":"urlType","required":false,"transform":{"type":"scalar"},"locs":[{"a":127,"b":134}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":141,"b":146}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":249,"b":269}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":295,"b":309}]}],"statement":"INSERT INTO collectives.collective_urls (\n    collective_id,\n    url,\n    url_type,\n    label\n)\nSELECT\n    c.id,\n    :url,\n    :urlType,\n    :label\nFROM collectives.collectives c\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE c.external_id = :collectiveExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    url,\n    url_type,\n    label,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO collectives.collective_urls (
 *     collective_id,
 *     url,
 *     url_type,
 *     label
 * )
 * SELECT
 *     c.id,
 *     :url,
 *     :urlType,
 *     :label
 * FROM collectives.collectives c
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE c.external_id = :collectiveExternalId
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
  collectiveExternalId?: string | null | void;
  label?: string | null | void;
  url?: string | null | void;
  urlExternalId?: string | null | void;
  urlType?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateUrl' return type */
export interface IUpdateUrlResult {
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Custom label for this URL */
  label: string | null;
  /** The URL */
  url: string;
  /** Type of URL: personal, work, blog, other */
  url_type: string;
}

/** 'UpdateUrl' query type */
export interface IUpdateUrlQuery {
  params: IUpdateUrlParams;
  result: IUpdateUrlResult;
}

const updateUrlIR: any = {"usedParamSet":{"url":true,"urlType":true,"label":true,"urlExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"url","required":false,"transform":{"type":"scalar"},"locs":[{"a":51,"b":54}]},{"name":"urlType","required":false,"transform":{"type":"scalar"},"locs":[{"a":72,"b":79}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":94,"b":99}]},{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":215}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":268,"b":288}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":314,"b":328}]}],"statement":"UPDATE collectives.collective_urls u\nSET\n    url = :url,\n    url_type = :urlType,\n    label = :label\nFROM collectives.collectives c\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE u.external_id = :urlExternalId\n  AND u.collective_id = c.id\n  AND c.external_id = :collectiveExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE collectives.collective_urls u
 * SET
 *     url = :url,
 *     url_type = :urlType,
 *     label = :label
 * FROM collectives.collectives c
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE u.external_id = :urlExternalId
 *   AND u.collective_id = c.id
 *   AND c.external_id = :collectiveExternalId
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
  collectiveExternalId?: string | null | void;
  urlExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteUrl' return type */
export interface IDeleteUrlResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'DeleteUrl' query type */
export interface IDeleteUrlQuery {
  params: IDeleteUrlParams;
  result: IDeleteUrlResult;
}

const deleteUrlIR: any = {"usedParamSet":{"urlExternalId":true,"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":112,"b":125}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":203,"b":223}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":249,"b":263}]}],"statement":"DELETE FROM collectives.collective_urls u\nUSING collectives.collectives c, auth.users usr\nWHERE u.external_id = :urlExternalId\n  AND u.collective_id = c.id\n  AND c.user_id = usr.id\n  AND c.external_id = :collectiveExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING u.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM collectives.collective_urls u
 * USING collectives.collectives c, auth.users usr
 * WHERE u.external_id = :urlExternalId
 *   AND u.collective_id = c.id
 *   AND c.user_id = usr.id
 *   AND c.external_id = :collectiveExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING u.external_id
 * ```
 */
export const deleteUrl = new PreparedQuery<IDeleteUrlParams,IDeleteUrlResult>(deleteUrlIR);


