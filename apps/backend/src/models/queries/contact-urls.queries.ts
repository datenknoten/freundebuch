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

const getUrlsByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":236,"b":253}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":279,"b":293}]}],"statement":"SELECT\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at\nFROM contacts.contact_urls u\nINNER JOIN contacts.contacts c ON u.contact_id = c.id\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY u.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * FROM contacts.contact_urls u
 * INNER JOIN contacts.contacts c ON u.contact_id = c.id
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

const getUrlByIdIR: any = {"usedParamSet":{"urlExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":236,"b":249}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":273,"b":290}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":316,"b":330}]}],"statement":"SELECT\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at\nFROM contacts.contact_urls u\nINNER JOIN contacts.contacts c ON u.contact_id = c.id\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE u.external_id = :urlExternalId\n  AND c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     u.external_id,
 *     u.url,
 *     u.url_type,
 *     u.label,
 *     u.created_at
 * FROM contacts.contact_urls u
 * INNER JOIN contacts.contacts c ON u.contact_id = c.id
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

const createUrlIR: any = {"usedParamSet":{"url":true,"urlType":true,"label":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"url","required":false,"transform":{"type":"scalar"},"locs":[{"a":108,"b":111}]},{"name":"urlType","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":125}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":132,"b":137}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":234,"b":251}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":277,"b":291}]}],"statement":"INSERT INTO contacts.contact_urls (\n    contact_id,\n    url,\n    url_type,\n    label\n)\nSELECT\n    c.id,\n    :url,\n    :urlType,\n    :label\nFROM contacts.contacts c\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    url,\n    url_type,\n    label,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_urls (
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
 * FROM contacts.contacts c
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

const updateUrlIR: any = {"usedParamSet":{"url":true,"urlType":true,"label":true,"urlExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"url","required":false,"transform":{"type":"scalar"},"locs":[{"a":45,"b":48}]},{"name":"urlType","required":false,"transform":{"type":"scalar"},"locs":[{"a":66,"b":73}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":88,"b":93}]},{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":190,"b":203}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":253,"b":270}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":310}]}],"statement":"UPDATE contacts.contact_urls u\nSET\n    url = :url,\n    url_type = :urlType,\n    label = :label\nFROM contacts.contacts c\nINNER JOIN auth.users usr ON c.user_id = usr.id\nWHERE u.external_id = :urlExternalId\n  AND u.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    u.external_id,\n    u.url,\n    u.url_type,\n    u.label,\n    u.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_urls u
 * SET
 *     url = :url,
 *     url_type = :urlType,
 *     label = :label
 * FROM contacts.contacts c
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

const deleteUrlIR: any = {"usedParamSet":{"urlExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"urlExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":100,"b":113}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":205}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":231,"b":245}]}],"statement":"DELETE FROM contacts.contact_urls u\nUSING contacts.contacts c, auth.users usr\nWHERE u.external_id = :urlExternalId\n  AND u.contact_id = c.id\n  AND c.user_id = usr.id\n  AND c.external_id = :contactExternalId\n  AND usr.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING u.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_urls u
 * USING contacts.contacts c, auth.users usr
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


