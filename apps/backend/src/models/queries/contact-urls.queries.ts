/** Types generated for queries found in "src/models/queries/contact-urls.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetUrlsByContactId' parameters type */
export interface IGetUrlsByContactIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetUrlsByContactId' return type */
export interface IGetUrlsByContactIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label */
  label: string | null;
  url: string;
  /** personal, work, blog, other */
  url_type: string;
}

/** 'GetUrlsByContactId' query type */
export interface IGetUrlsByContactIdQuery {
  params: IGetUrlsByContactIdParams;
  result: IGetUrlsByContactIdResult;
}

const getUrlsByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":218,"b":235}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":261,"b":275}]}],"statement":"SELECT\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at\nFROM contact_urls u\nINNER JOIN contacts c ON u.contact_id = c.id\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY u.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * FROM contact_urls u
 * INNER JOIN contacts c ON u.contact_id = c.id
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE c.external_id = :contactExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY u.created_at ASC
 * ```
 */
export const getUrlsByContactId = new PreparedQuery<IGetUrlsByContactIdParams,IGetUrlsByContactIdResult>(getUrlsByContactIdIR);


/** 'GetUrlById' parameters type */
export interface IGetUrlByIdParams {
  contactExternalId?: string | null | void;
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

const getUrlByIdIR: any = {"usedParamSet":{"urlExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":218,"b":231}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":255,"b":272}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":312}]}],"statement":"SELECT\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at\nFROM contact_urls u\nINNER JOIN contacts c ON u.contact_id = c.id\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE u.external_id = :urlExternalId\n  AND c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * FROM contact_urls u
 * INNER JOIN contacts c ON u.contact_id = c.id
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE u.external_id = :urlExternalId
 *   AND c.external_id = :contactExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getUrlById = new PreparedQuery<IGetUrlByIdParams,IGetUrlByIdResult>(getUrlByIdIR);


/** 'CreateUrl' parameters type */
export interface ICreateUrlParams {
  contactExternalId?: string | null | void;
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

const createUrlIR: any = {"usedParamSet":{"url":true,"urlType":true,"label":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"url","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":102}]},{"name":"urlType","required":false,"transform":{"type":"scalar"},"locs":[{"a":109,"b":116}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":123,"b":128}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":216,"b":233}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":273}]}],"statement":"INSERT INTO contact_urls (\n    contact_id,\n    url,\n    url_type,\n    label\n)\nSELECT\n    c.id,\n    :url,\n    :urlType,\n    :label\nFROM contacts c\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    url,\n    url_type,\n    label,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contact_urls (
 *     contact_id,
 *     url,
 *     url_type,
 *     label
 * )
 * SELECT
 *     c.id,
 *     :url,
 *     :urlType,
 *     :label
 * FROM contacts c
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
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

const updateUrlIR: any = {"usedParamSet":{"url":true,"urlType":true,"label":true,"urlExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"url","required":false,"transform":{"type":"scalar"},"locs":[{"a":36,"b":39}]},{"name":"urlType","required":false,"transform":{"type":"scalar"},"locs":[{"a":57,"b":64}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":79,"b":84}]},{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":172,"b":185}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":252}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":292}]}],"statement":"UPDATE contact_urls u\nSET\n    url = :url,\n    url_type = :urlType,\n    label = :label\nFROM contacts c\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE u.external_id = :urlExternalId\n  AND u.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contact_urls u
 * SET
 *     url = :url,
 *     url_type = :urlType,
 *     label = :label
 * FROM contacts c
 * INNER JOIN auth.users usr ON c.user_id = usr.id
 * WHERE u.external_id = :urlExternalId
 *   AND u.contact_id = c.id
 *   AND c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
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

const deleteUrlIR: any = {"usedParamSet":{"urlExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":82,"b":95}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":170,"b":187}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":213,"b":227}]}],"statement":"DELETE FROM contact_urls u\nUSING contacts c, auth.users usr\nWHERE u.external_id = :urlExternalId\n  AND u.contact_id = c.id\n  AND c.user_id = usr.id\n  AND c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING u.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contact_urls u
 * USING contacts c, auth.users usr
 * WHERE u.external_id = :urlExternalId
 *   AND u.contact_id = c.id
 *   AND c.user_id = usr.id
 *   AND c.external_id = :contactExternalId
 *   AND usr.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING u.external_id
 * ```
 */
export const deleteUrl = new PreparedQuery<IDeleteUrlParams,IDeleteUrlResult>(deleteUrlIR);


