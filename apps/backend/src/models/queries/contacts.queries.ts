/** Types generated for queries found in "src/models/queries/contacts.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

/** 'GetContactById' parameters type */
export interface IGetContactByIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetContactById' return type */
export interface IGetContactByIdResult {
  addresses: Json | null;
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  emails: Json | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** First/given name */
  name_first: string | null;
  /** Last/family name */
  name_last: string | null;
  /** Middle name(s) */
  name_middle: string | null;
  /** Dr., Mr., Ms., Prof., etc. */
  name_prefix: string | null;
  /** Jr., Sr., III, PhD, etc. */
  name_suffix: string | null;
  phones: Json | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
  urls: Json | null;
}

/** 'GetContactById' query type */
export interface IGetContactByIdQuery {
  params: IGetContactByIdParams;
  result: IGetContactByIdResult;
}

const getContactByIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2239,"b":2256}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2280,"b":2294}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.updated_at,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', p.external_id,\n            'phone_number', p.phone_number,\n            'phone_type', p.phone_type,\n            'label', p.label,\n            'is_primary', p.is_primary,\n            'created_at', p.created_at\n        ) ORDER BY p.is_primary DESC, p.created_at ASC), '[]'::json)\n        FROM contacts.contact_phones p\n        WHERE p.contact_id = c.id\n    ) as phones,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', e.external_id,\n            'email_address', e.email_address,\n            'email_type', e.email_type,\n            'label', e.label,\n            'is_primary', e.is_primary,\n            'created_at', e.created_at\n        ) ORDER BY e.is_primary DESC, e.created_at ASC), '[]'::json)\n        FROM contacts.contact_emails e\n        WHERE e.contact_id = c.id\n    ) as emails,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', a.external_id,\n            'street_line1', a.street_line1,\n            'street_line2', a.street_line2,\n            'city', a.city,\n            'state_province', a.state_province,\n            'postal_code', a.postal_code,\n            'country', a.country,\n            'address_type', a.address_type,\n            'label', a.label,\n            'is_primary', a.is_primary,\n            'created_at', a.created_at\n        ) ORDER BY a.is_primary DESC, a.created_at ASC), '[]'::json)\n        FROM contacts.contact_addresses a\n        WHERE a.contact_id = c.id\n    ) as addresses,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', u.external_id,\n            'url', u.url,\n            'url_type', u.url_type,\n            'label', u.label,\n            'created_at', u.created_at\n        ) ORDER BY u.created_at ASC), '[]'::json)\n        FROM contacts.contact_urls u\n        WHERE u.contact_id = c.id\n    ) as urls\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.display_name,
 *     c.name_prefix,
 *     c.name_first,
 *     c.name_middle,
 *     c.name_last,
 *     c.name_suffix,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.created_at,
 *     c.updated_at,
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', p.external_id,
 *             'phone_number', p.phone_number,
 *             'phone_type', p.phone_type,
 *             'label', p.label,
 *             'is_primary', p.is_primary,
 *             'created_at', p.created_at
 *         ) ORDER BY p.is_primary DESC, p.created_at ASC), '[]'::json)
 *         FROM contacts.contact_phones p
 *         WHERE p.contact_id = c.id
 *     ) as phones,
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', e.external_id,
 *             'email_address', e.email_address,
 *             'email_type', e.email_type,
 *             'label', e.label,
 *             'is_primary', e.is_primary,
 *             'created_at', e.created_at
 *         ) ORDER BY e.is_primary DESC, e.created_at ASC), '[]'::json)
 *         FROM contacts.contact_emails e
 *         WHERE e.contact_id = c.id
 *     ) as emails,
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', a.external_id,
 *             'street_line1', a.street_line1,
 *             'street_line2', a.street_line2,
 *             'city', a.city,
 *             'state_province', a.state_province,
 *             'postal_code', a.postal_code,
 *             'country', a.country,
 *             'address_type', a.address_type,
 *             'label', a.label,
 *             'is_primary', a.is_primary,
 *             'created_at', a.created_at
 *         ) ORDER BY a.is_primary DESC, a.created_at ASC), '[]'::json)
 *         FROM contacts.contact_addresses a
 *         WHERE a.contact_id = c.id
 *     ) as addresses,
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', u.external_id,
 *             'url', u.url,
 *             'url_type', u.url_type,
 *             'label', u.label,
 *             'created_at', u.created_at
 *         ) ORDER BY u.created_at ASC), '[]'::json)
 *         FROM contacts.contact_urls u
 *         WHERE u.contact_id = c.id
 *     ) as urls
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getContactById = new PreparedQuery<IGetContactByIdParams,IGetContactByIdResult>(getContactByIdIR);


/** 'GetContactInternalId' parameters type */
export interface IGetContactInternalIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetContactInternalId' return type */
export interface IGetContactInternalIdResult {
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetContactInternalId' query type */
export interface IGetContactInternalIdQuery {
  params: IGetContactInternalIdParams;
  result: IGetContactInternalIdResult;
}

const getContactInternalIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":120}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":158}]}],"statement":"SELECT c.id\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT c.id
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getContactInternalId = new PreparedQuery<IGetContactInternalIdParams,IGetContactInternalIdResult>(getContactInternalIdIR);


/** 'GetContactsByUserId' parameters type */
export interface IGetContactsByUserIdParams {
  offset?: NumberOrString | null | void;
  pageSize?: NumberOrString | null | void;
  sortBy?: string | null | void;
  sortOrder?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetContactsByUserId' return type */
export interface IGetContactsByUserIdResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  total_count: number | null;
  updated_at: Date;
}

/** 'GetContactsByUserId' query type */
export interface IGetContactsByUserIdQuery {
  params: IGetContactsByUserIdParams;
  result: IGetContactsByUserIdResult;
}

const getContactsByUserIdIR: any = {"usedParamSet":{"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":272,"b":286}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":861,"b":867},{"a":953,"b":959},{"a":1047,"b":1053},{"a":1135,"b":1141},{"a":1225,"b":1231},{"a":1313,"b":1319}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":890,"b":899},{"a":982,"b":991},{"a":1074,"b":1083},{"a":1162,"b":1171},{"a":1252,"b":1261},{"a":1340,"b":1349}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":1394,"b":1402}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1411,"b":1417}]}],"statement":"WITH contact_list AS (\n    SELECT\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.created_at,\n        c.updated_at\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n),\ntotal AS (\n    SELECT COUNT(*)::int as total_count FROM contact_list\n)\nSELECT\n    cl.external_id,\n    cl.display_name,\n    cl.photo_thumbnail_url,\n    cl.created_at,\n    cl.updated_at,\n    (SELECT e.email_address FROM contacts.contact_emails e WHERE e.contact_id = cl.id AND e.is_primary = true LIMIT 1) as primary_email,\n    (SELECT p.phone_number FROM contacts.contact_phones p WHERE p.contact_id = cl.id AND p.is_primary = true LIMIT 1) as primary_phone,\n    t.total_count\nFROM contact_list cl\nCROSS JOIN total t\nORDER BY\n    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN cl.display_name END ASC,\n    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN cl.display_name END DESC,\n    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN cl.created_at END ASC,\n    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN cl.created_at END DESC,\n    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN cl.updated_at END ASC,\n    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN cl.updated_at END DESC\nLIMIT :pageSize\nOFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * WITH contact_list AS (
 *     SELECT
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         c.created_at,
 *         c.updated_at
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 * ),
 * total AS (
 *     SELECT COUNT(*)::int as total_count FROM contact_list
 * )
 * SELECT
 *     cl.external_id,
 *     cl.display_name,
 *     cl.photo_thumbnail_url,
 *     cl.created_at,
 *     cl.updated_at,
 *     (SELECT e.email_address FROM contacts.contact_emails e WHERE e.contact_id = cl.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     (SELECT p.phone_number FROM contacts.contact_phones p WHERE p.contact_id = cl.id AND p.is_primary = true LIMIT 1) as primary_phone,
 *     t.total_count
 * FROM contact_list cl
 * CROSS JOIN total t
 * ORDER BY
 *     CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN cl.display_name END ASC,
 *     CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN cl.display_name END DESC,
 *     CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN cl.created_at END ASC,
 *     CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN cl.created_at END DESC,
 *     CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN cl.updated_at END ASC,
 *     CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN cl.updated_at END DESC
 * LIMIT :pageSize
 * OFFSET :offset
 * ```
 */
export const getContactsByUserId = new PreparedQuery<IGetContactsByUserIdParams,IGetContactsByUserIdResult>(getContactsByUserIdIR);


/** 'CreateContact' parameters type */
export interface ICreateContactParams {
  displayName?: string | null | void;
  nameFirst?: string | null | void;
  nameLast?: string | null | void;
  nameMiddle?: string | null | void;
  namePrefix?: string | null | void;
  nameSuffix?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateContact' return type */
export interface ICreateContactResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** First/given name */
  name_first: string | null;
  /** Last/family name */
  name_last: string | null;
  /** Middle name(s) */
  name_middle: string | null;
  /** Dr., Mr., Ms., Prof., etc. */
  name_prefix: string | null;
  /** Jr., Sr., III, PhD, etc. */
  name_suffix: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
}

/** 'CreateContact' query type */
export interface ICreateContactQuery {
  params: ICreateContactParams;
  result: ICreateContactResult;
}

const createContactIR: any = {"usedParamSet":{"displayName":true,"namePrefix":true,"nameFirst":true,"nameMiddle":true,"nameLast":true,"nameSuffix":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":167,"b":178}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":185,"b":195}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":211}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":218,"b":228}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":243}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":250,"b":260}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":316}]}],"statement":"INSERT INTO contacts.contacts (\n    user_id,\n    display_name,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix\n)\nSELECT\n    u.id,\n    :displayName,\n    :namePrefix,\n    :nameFirst,\n    :nameMiddle,\n    :nameLast,\n    :nameSuffix\nFROM auth.users u\nWHERE u.external_id = :userExternalId\nRETURNING\n    external_id,\n    display_name,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix,\n    photo_url,\n    photo_thumbnail_url,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contacts (
 *     user_id,
 *     display_name,
 *     name_prefix,
 *     name_first,
 *     name_middle,
 *     name_last,
 *     name_suffix
 * )
 * SELECT
 *     u.id,
 *     :displayName,
 *     :namePrefix,
 *     :nameFirst,
 *     :nameMiddle,
 *     :nameLast,
 *     :nameSuffix
 * FROM auth.users u
 * WHERE u.external_id = :userExternalId
 * RETURNING
 *     external_id,
 *     display_name,
 *     name_prefix,
 *     name_first,
 *     name_middle,
 *     name_last,
 *     name_suffix,
 *     photo_url,
 *     photo_thumbnail_url,
 *     created_at,
 *     updated_at
 * ```
 */
export const createContact = new PreparedQuery<ICreateContactParams,ICreateContactResult>(createContactIR);


/** 'UpdateContact' parameters type */
export interface IUpdateContactParams {
  contactExternalId?: string | null | void;
  displayName?: string | null | void;
  nameFirst?: string | null | void;
  nameLast?: string | null | void;
  nameMiddle?: string | null | void;
  namePrefix?: string | null | void;
  nameSuffix?: string | null | void;
  updateNameFirst?: boolean | null | void;
  updateNameLast?: boolean | null | void;
  updateNameMiddle?: boolean | null | void;
  updateNamePrefix?: boolean | null | void;
  updateNameSuffix?: boolean | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateContact' return type */
export interface IUpdateContactResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** First/given name */
  name_first: string | null;
  /** Last/family name */
  name_last: string | null;
  /** Middle name(s) */
  name_middle: string | null;
  /** Dr., Mr., Ms., Prof., etc. */
  name_prefix: string | null;
  /** Jr., Sr., III, PhD, etc. */
  name_suffix: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
}

/** 'UpdateContact' query type */
export interface IUpdateContactQuery {
  params: IUpdateContactParams;
  result: IUpdateContactResult;
}

const updateContactIR: any = {"usedParamSet":{"displayName":true,"updateNamePrefix":true,"namePrefix":true,"updateNameFirst":true,"nameFirst":true,"updateNameMiddle":true,"nameMiddle":true,"updateNameLast":true,"nameLast":true,"updateNameSuffix":true,"nameSuffix":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":59,"b":70}]},{"name":"updateNamePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":134}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":141,"b":151}]},{"name":"updateNameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":219}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":235}]},{"name":"updateNameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":304}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":311,"b":321}]},{"name":"updateNameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":373,"b":387}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":402}]},{"name":"updateNameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":454,"b":470}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":477,"b":487}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":552,"b":569}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":616,"b":630}]}],"statement":"UPDATE contacts.contacts c\nSET\n    display_name = COALESCE(:displayName, c.display_name),\n    name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,\n    name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,\n    name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,\n    name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,\n    name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.display_name,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contacts c
 * SET
 *     display_name = COALESCE(:displayName, c.display_name),
 *     name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,
 *     name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,
 *     name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,
 *     name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,
 *     name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END
 * FROM auth.users u
 * WHERE c.external_id = :contactExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     c.external_id,
 *     c.display_name,
 *     c.name_prefix,
 *     c.name_first,
 *     c.name_middle,
 *     c.name_last,
 *     c.name_suffix,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.created_at,
 *     c.updated_at
 * ```
 */
export const updateContact = new PreparedQuery<IUpdateContactParams,IUpdateContactResult>(updateContactIR);


/** 'SoftDeleteContact' parameters type */
export interface ISoftDeleteContactParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SoftDeleteContact' return type */
export interface ISoftDeleteContactResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'SoftDeleteContact' query type */
export interface ISoftDeleteContactQuery {
  params: ISoftDeleteContactParams;
  result: ISoftDeleteContactResult;
}

const softDeleteContactIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":102,"b":119}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":180}]}],"statement":"UPDATE contacts.contacts c\nSET deleted_at = CURRENT_TIMESTAMP\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING c.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contacts c
 * SET deleted_at = CURRENT_TIMESTAMP
 * FROM auth.users u
 * WHERE c.external_id = :contactExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING c.external_id
 * ```
 */
export const softDeleteContact = new PreparedQuery<ISoftDeleteContactParams,ISoftDeleteContactResult>(softDeleteContactIR);


/** 'UpdateContactPhoto' parameters type */
export interface IUpdateContactPhotoParams {
  contactExternalId?: string | null | void;
  photoThumbnailUrl?: string | null | void;
  photoUrl?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateContactPhoto' return type */
export interface IUpdateContactPhotoResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
}

/** 'UpdateContactPhoto' query type */
export interface IUpdateContactPhotoQuery {
  params: IUpdateContactPhotoParams;
  result: IUpdateContactPhotoResult;
}

const updateContactPhotoIR: any = {"usedParamSet":{"photoUrl":true,"photoThumbnailUrl":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"photoUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":47,"b":55}]},{"name":"photoThumbnailUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":84,"b":101}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":160}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":207,"b":221}]}],"statement":"UPDATE contacts.contacts c\nSET\n    photo_url = :photoUrl,\n    photo_thumbnail_url = :photoThumbnailUrl\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.photo_url,\n    c.photo_thumbnail_url"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contacts c
 * SET
 *     photo_url = :photoUrl,
 *     photo_thumbnail_url = :photoThumbnailUrl
 * FROM auth.users u
 * WHERE c.external_id = :contactExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     c.external_id,
 *     c.photo_url,
 *     c.photo_thumbnail_url
 * ```
 */
export const updateContactPhoto = new PreparedQuery<IUpdateContactPhotoParams,IUpdateContactPhotoResult>(updateContactPhotoIR);


