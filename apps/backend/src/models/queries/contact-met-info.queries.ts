/** Types generated for queries found in "src/models/queries/contact-met-info.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

/** 'GetMetInfoByContactId' parameters type */
export interface IGetMetInfoByContactIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetMetInfoByContactId' return type */
export interface IGetMetInfoByContactIdResult {
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

/** 'GetMetInfoByContactId' query type */
export interface IGetMetInfoByContactIdQuery {
  params: IGetMetInfoByContactIdParams;
  result: IGetMetInfoByContactIdResult;
}

const getMetInfoByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":269,"b":286}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":310,"b":324}]}],"statement":"SELECT\n    m.external_id,\n    m.met_date,\n    m.met_location,\n    m.met_context,\n    m.created_at,\n    m.updated_at\nFROM contacts.contact_met_info m\nINNER JOIN contacts.contacts c ON m.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM contacts.contact_met_info m
 * INNER JOIN contacts.contacts c ON m.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getMetInfoByContactId = new PreparedQuery<IGetMetInfoByContactIdParams,IGetMetInfoByContactIdResult>(getMetInfoByContactIdIR);


/** 'UpsertMetInfo' parameters type */
export interface IUpsertMetInfoParams {
  contactExternalId?: string | null | void;
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

const upsertMetInfoIR: any = {"usedParamSet":{"metDate":true,"metLocation":true,"metContext":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"metDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":127,"b":134},{"a":406,"b":413}]},{"name":"metLocation","required":false,"transform":{"type":"scalar"},"locs":[{"a":147,"b":158},{"a":441,"b":452}]},{"name":"metContext","required":false,"transform":{"type":"scalar"},"locs":[{"a":165,"b":175},{"a":473,"b":483}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":268,"b":285}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":309,"b":323}]}],"statement":"INSERT INTO contacts.contact_met_info (\n    contact_id,\n    met_date,\n    met_location,\n    met_context\n)\nSELECT\n    c.id,\n    :metDate::date,\n    :metLocation,\n    :metContext\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nON CONFLICT (contact_id)\nDO UPDATE SET\n    met_date = :metDate::date,\n    met_location = :metLocation,\n    met_context = :metContext,\n    updated_at = CURRENT_TIMESTAMP\nRETURNING\n    external_id,\n    met_date,\n    met_location,\n    met_context,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_met_info (
 *     contact_id,
 *     met_date,
 *     met_location,
 *     met_context
 * )
 * SELECT
 *     c.id,
 *     :metDate::date,
 *     :metLocation,
 *     :metContext
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ON CONFLICT (contact_id)
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
  contactExternalId?: string | null | void;
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

const deleteMetInfoIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":151,"b":168}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":192,"b":206}]}],"statement":"DELETE FROM contacts.contact_met_info m\nUSING contacts.contacts c, auth.users u\nWHERE m.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING m.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_met_info m
 * USING contacts.contacts c, auth.users u
 * WHERE m.contact_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING m.external_id
 * ```
 */
export const deleteMetInfo = new PreparedQuery<IDeleteMetInfoParams,IDeleteMetInfoResult>(deleteMetInfoIR);


