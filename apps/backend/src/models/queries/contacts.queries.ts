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
  dates: Json | null;
  /** Department within organization */
  department: string | null;
  /** Primary name shown in lists */
  display_name: string;
  emails: Json | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Interests and hobbies (free-form text) */
  interests: string | null;
  /** Job title / position */
  job_title: string | null;
  met_info: Json | null;
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
  /** Company / organization name */
  organization: string | null;
  phones: Json | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  social_profiles: Json | null;
  updated_at: Date;
  urls: Json | null;
  /** Notes about professional context */
  work_notes: string | null;
}

/** 'GetContactById' query type */
export interface IGetContactByIdQuery {
  params: IGetContactByIdParams;
  result: IGetContactByIdResult;
}

const getContactByIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3715,"b":3732}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3756,"b":3770}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    -- Epic 1B: Professional fields\n    c.job_title,\n    c.organization,\n    c.department,\n    c.work_notes,\n    c.interests,\n    c.created_at,\n    c.updated_at,\n    -- Epic 1A: Sub-resources\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', p.external_id,\n            'phone_number', p.phone_number,\n            'phone_type', p.phone_type,\n            'label', p.label,\n            'is_primary', p.is_primary,\n            'created_at', p.created_at\n        ) ORDER BY p.is_primary DESC, p.created_at ASC), '[]'::json)\n        FROM contacts.contact_phones p\n        WHERE p.contact_id = c.id\n    ) as phones,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', e.external_id,\n            'email_address', e.email_address,\n            'email_type', e.email_type,\n            'label', e.label,\n            'is_primary', e.is_primary,\n            'created_at', e.created_at\n        ) ORDER BY e.is_primary DESC, e.created_at ASC), '[]'::json)\n        FROM contacts.contact_emails e\n        WHERE e.contact_id = c.id\n    ) as emails,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', a.external_id,\n            'street_line1', a.street_line1,\n            'street_line2', a.street_line2,\n            'city', a.city,\n            'state_province', a.state_province,\n            'postal_code', a.postal_code,\n            'country', a.country,\n            'address_type', a.address_type,\n            'label', a.label,\n            'is_primary', a.is_primary,\n            'created_at', a.created_at\n        ) ORDER BY a.is_primary DESC, a.created_at ASC), '[]'::json)\n        FROM contacts.contact_addresses a\n        WHERE a.contact_id = c.id\n    ) as addresses,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', url.external_id,\n            'url', url.url,\n            'url_type', url.url_type,\n            'label', url.label,\n            'created_at', url.created_at\n        ) ORDER BY url.created_at ASC), '[]'::json)\n        FROM contacts.contact_urls url\n        WHERE url.contact_id = c.id\n    ) as urls,\n    -- Epic 1B: Extended sub-resources\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', d.external_id,\n            'date_value', d.date_value,\n            'year_known', d.year_known,\n            'date_type', d.date_type,\n            'label', d.label,\n            'created_at', d.created_at\n        ) ORDER BY d.date_type ASC, d.created_at ASC), '[]'::json)\n        FROM contacts.contact_dates d\n        WHERE d.contact_id = c.id\n    ) as dates,\n    (\n        SELECT json_build_object(\n            'external_id', m.external_id,\n            'met_date', m.met_date,\n            'met_location', m.met_location,\n            'met_context', m.met_context,\n            'created_at', m.created_at,\n            'updated_at', m.updated_at\n        )\n        FROM contacts.contact_met_info m\n        WHERE m.contact_id = c.id\n    ) as met_info,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', sp.external_id,\n            'platform', sp.platform,\n            'profile_url', sp.profile_url,\n            'username', sp.username,\n            'created_at', sp.created_at\n        ) ORDER BY sp.platform ASC, sp.created_at ASC), '[]'::json)\n        FROM contacts.contact_social_profiles sp\n        WHERE sp.contact_id = c.id\n    ) as social_profiles\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 *     -- Epic 1B: Professional fields
 *     c.job_title,
 *     c.organization,
 *     c.department,
 *     c.work_notes,
 *     c.interests,
 *     c.created_at,
 *     c.updated_at,
 *     -- Epic 1A: Sub-resources
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
 *             'external_id', url.external_id,
 *             'url', url.url,
 *             'url_type', url.url_type,
 *             'label', url.label,
 *             'created_at', url.created_at
 *         ) ORDER BY url.created_at ASC), '[]'::json)
 *         FROM contacts.contact_urls url
 *         WHERE url.contact_id = c.id
 *     ) as urls,
 *     -- Epic 1B: Extended sub-resources
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', d.external_id,
 *             'date_value', d.date_value,
 *             'year_known', d.year_known,
 *             'date_type', d.date_type,
 *             'label', d.label,
 *             'created_at', d.created_at
 *         ) ORDER BY d.date_type ASC, d.created_at ASC), '[]'::json)
 *         FROM contacts.contact_dates d
 *         WHERE d.contact_id = c.id
 *     ) as dates,
 *     (
 *         SELECT json_build_object(
 *             'external_id', m.external_id,
 *             'met_date', m.met_date,
 *             'met_location', m.met_location,
 *             'met_context', m.met_context,
 *             'created_at', m.created_at,
 *             'updated_at', m.updated_at
 *         )
 *         FROM contacts.contact_met_info m
 *         WHERE m.contact_id = c.id
 *     ) as met_info,
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', sp.external_id,
 *             'platform', sp.platform,
 *             'profile_url', sp.profile_url,
 *             'username', sp.username,
 *             'created_at', sp.created_at
 *         ) ORDER BY sp.platform ASC, sp.created_at ASC), '[]'::json)
 *         FROM contacts.contact_social_profiles sp
 *         WHERE sp.contact_id = c.id
 *     ) as social_profiles
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
  department?: string | null | void;
  displayName?: string | null | void;
  interests?: string | null | void;
  jobTitle?: string | null | void;
  nameFirst?: string | null | void;
  nameLast?: string | null | void;
  nameMiddle?: string | null | void;
  namePrefix?: string | null | void;
  nameSuffix?: string | null | void;
  organization?: string | null | void;
  userExternalId?: string | null | void;
  workNotes?: string | null | void;
}

/** 'CreateContact' return type */
export interface ICreateContactResult {
  created_at: Date;
  /** Department within organization */
  department: string | null;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Interests and hobbies (free-form text) */
  interests: string | null;
  /** Job title / position */
  job_title: string | null;
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
  /** Company / organization name */
  organization: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
  /** Notes about professional context */
  work_notes: string | null;
}

/** 'CreateContact' query type */
export interface ICreateContactQuery {
  params: ICreateContactParams;
  result: ICreateContactResult;
}

const createContactIR: any = {"usedParamSet":{"displayName":true,"namePrefix":true,"nameFirst":true,"nameMiddle":true,"nameLast":true,"nameSuffix":true,"jobTitle":true,"organization":true,"department":true,"workNotes":true,"interests":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":283,"b":294}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":301,"b":311}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":318,"b":327}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":334,"b":344}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":351,"b":359}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":366,"b":376}]},{"name":"jobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":383,"b":391}]},{"name":"organization","required":false,"transform":{"type":"scalar"},"locs":[{"a":398,"b":410}]},{"name":"department","required":false,"transform":{"type":"scalar"},"locs":[{"a":417,"b":427}]},{"name":"workNotes","required":false,"transform":{"type":"scalar"},"locs":[{"a":434,"b":443}]},{"name":"interests","required":false,"transform":{"type":"scalar"},"locs":[{"a":450,"b":459}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":501,"b":515}]}],"statement":"INSERT INTO contacts.contacts (\n    user_id,\n    display_name,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix,\n    -- Epic 1B: Professional fields\n    job_title,\n    organization,\n    department,\n    work_notes,\n    interests\n)\nSELECT\n    u.id,\n    :displayName,\n    :namePrefix,\n    :nameFirst,\n    :nameMiddle,\n    :nameLast,\n    :nameSuffix,\n    :jobTitle,\n    :organization,\n    :department,\n    :workNotes,\n    :interests\nFROM auth.users u\nWHERE u.external_id = :userExternalId\nRETURNING\n    external_id,\n    display_name,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix,\n    photo_url,\n    photo_thumbnail_url,\n    job_title,\n    organization,\n    department,\n    work_notes,\n    interests,\n    created_at,\n    updated_at"};

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
 *     name_suffix,
 *     -- Epic 1B: Professional fields
 *     job_title,
 *     organization,
 *     department,
 *     work_notes,
 *     interests
 * )
 * SELECT
 *     u.id,
 *     :displayName,
 *     :namePrefix,
 *     :nameFirst,
 *     :nameMiddle,
 *     :nameLast,
 *     :nameSuffix,
 *     :jobTitle,
 *     :organization,
 *     :department,
 *     :workNotes,
 *     :interests
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
 *     job_title,
 *     organization,
 *     department,
 *     work_notes,
 *     interests,
 *     created_at,
 *     updated_at
 * ```
 */
export const createContact = new PreparedQuery<ICreateContactParams,ICreateContactResult>(createContactIR);


/** 'UpdateContact' parameters type */
export interface IUpdateContactParams {
  contactExternalId?: string | null | void;
  department?: string | null | void;
  displayName?: string | null | void;
  interests?: string | null | void;
  jobTitle?: string | null | void;
  nameFirst?: string | null | void;
  nameLast?: string | null | void;
  nameMiddle?: string | null | void;
  namePrefix?: string | null | void;
  nameSuffix?: string | null | void;
  organization?: string | null | void;
  updateDepartment?: boolean | null | void;
  updateInterests?: boolean | null | void;
  updateJobTitle?: boolean | null | void;
  updateNameFirst?: boolean | null | void;
  updateNameLast?: boolean | null | void;
  updateNameMiddle?: boolean | null | void;
  updateNamePrefix?: boolean | null | void;
  updateNameSuffix?: boolean | null | void;
  updateOrganization?: boolean | null | void;
  updateWorkNotes?: boolean | null | void;
  userExternalId?: string | null | void;
  workNotes?: string | null | void;
}

/** 'UpdateContact' return type */
export interface IUpdateContactResult {
  created_at: Date;
  /** Department within organization */
  department: string | null;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Interests and hobbies (free-form text) */
  interests: string | null;
  /** Job title / position */
  job_title: string | null;
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
  /** Company / organization name */
  organization: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
  /** Notes about professional context */
  work_notes: string | null;
}

/** 'UpdateContact' query type */
export interface IUpdateContactQuery {
  params: IUpdateContactParams;
  result: IUpdateContactResult;
}

const updateContactIR: any = {"usedParamSet":{"displayName":true,"updateNamePrefix":true,"namePrefix":true,"updateNameFirst":true,"nameFirst":true,"updateNameMiddle":true,"nameMiddle":true,"updateNameLast":true,"nameLast":true,"updateNameSuffix":true,"nameSuffix":true,"updateJobTitle":true,"jobTitle":true,"updateOrganization":true,"organization":true,"updateDepartment":true,"department":true,"updateWorkNotes":true,"workNotes":true,"updateInterests":true,"interests":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":59,"b":70}]},{"name":"updateNamePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":134}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":141,"b":151}]},{"name":"updateNameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":219}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":235}]},{"name":"updateNameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":304}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":311,"b":321}]},{"name":"updateNameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":373,"b":387}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":402}]},{"name":"updateNameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":454,"b":470}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":477,"b":487}]},{"name":"updateJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":575,"b":589}]},{"name":"jobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":596,"b":604}]},{"name":"updateOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":657,"b":675}]},{"name":"organization","required":false,"transform":{"type":"scalar"},"locs":[{"a":682,"b":694}]},{"name":"updateDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":748,"b":764}]},{"name":"department","required":false,"transform":{"type":"scalar"},"locs":[{"a":771,"b":781}]},{"name":"updateWorkNotes","required":false,"transform":{"type":"scalar"},"locs":[{"a":833,"b":848}]},{"name":"workNotes","required":false,"transform":{"type":"scalar"},"locs":[{"a":855,"b":864}]},{"name":"updateInterests","required":false,"transform":{"type":"scalar"},"locs":[{"a":915,"b":930}]},{"name":"interests","required":false,"transform":{"type":"scalar"},"locs":[{"a":937,"b":946}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1009,"b":1026}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1073,"b":1087}]}],"statement":"UPDATE contacts.contacts c\nSET\n    display_name = COALESCE(:displayName, c.display_name),\n    name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,\n    name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,\n    name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,\n    name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,\n    name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END,\n    -- Epic 1B: Professional fields\n    job_title = CASE WHEN :updateJobTitle THEN :jobTitle ELSE c.job_title END,\n    organization = CASE WHEN :updateOrganization THEN :organization ELSE c.organization END,\n    department = CASE WHEN :updateDepartment THEN :department ELSE c.department END,\n    work_notes = CASE WHEN :updateWorkNotes THEN :workNotes ELSE c.work_notes END,\n    interests = CASE WHEN :updateInterests THEN :interests ELSE c.interests END\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.display_name,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.job_title,\n    c.organization,\n    c.department,\n    c.work_notes,\n    c.interests,\n    c.created_at,\n    c.updated_at"};

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
 *     name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END,
 *     -- Epic 1B: Professional fields
 *     job_title = CASE WHEN :updateJobTitle THEN :jobTitle ELSE c.job_title END,
 *     organization = CASE WHEN :updateOrganization THEN :organization ELSE c.organization END,
 *     department = CASE WHEN :updateDepartment THEN :department ELSE c.department END,
 *     work_notes = CASE WHEN :updateWorkNotes THEN :workNotes ELSE c.work_notes END,
 *     interests = CASE WHEN :updateInterests THEN :interests ELSE c.interests END
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
 *     c.job_title,
 *     c.organization,
 *     c.department,
 *     c.work_notes,
 *     c.interests,
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


