/** Types generated for queries found in "src/models/queries/friends.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

/** 'GetFriendById' parameters type */
export interface IGetFriendByIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetFriendById' return type */
export interface IGetFriendByIdResult {
  addresses: Json | null;
  /** Optional reason for archiving this friend */
  archive_reason: string | null;
  /** When this friend was archived (null if not archived) */
  archived_at: Date | null;
  circles: Json | null;
  created_at: Date;
  dates: Json | null;
  /** Primary name shown in lists */
  display_name: string;
  emails: Json | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Interests and hobbies (free-form text) */
  interests: string | null;
  /** Whether this friend is marked as a favorite */
  is_favorite: boolean;
  /** Maiden name or birth name for the friend */
  maiden_name: string | null;
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
  /** Informal name or nickname for the friend */
  nickname: string | null;
  phones: Json | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  professional_history: Json | null;
  relationships: Json | null;
  social_profiles: Json | null;
  updated_at: Date;
  urls: Json | null;
}

/** 'GetFriendById' query type */
export interface IGetFriendByIdQuery {
  params: IGetFriendByIdParams;
  result: IGetFriendByIdResult;
}

const getFriendByIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":5825,"b":5841}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":5865,"b":5879}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.nickname,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.maiden_name,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.interests,\n    -- Epic 4: Categorization & Organization\n    c.is_favorite,\n    c.archived_at,\n    c.archive_reason,\n    c.created_at,\n    c.updated_at,\n    -- Epic 1A: Sub-resources\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', p.external_id,\n            'phone_number', p.phone_number,\n            'phone_type', p.phone_type,\n            'label', p.label,\n            'is_primary', p.is_primary,\n            'created_at', p.created_at\n        ) ORDER BY p.is_primary DESC, p.created_at ASC), '[]'::json)\n        FROM friends.friend_phones p\n        WHERE p.friend_id = c.id\n    ) as phones,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', e.external_id,\n            'email_address', e.email_address,\n            'email_type', e.email_type,\n            'label', e.label,\n            'is_primary', e.is_primary,\n            'created_at', e.created_at\n        ) ORDER BY e.is_primary DESC, e.created_at ASC), '[]'::json)\n        FROM friends.friend_emails e\n        WHERE e.friend_id = c.id\n    ) as emails,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', a.external_id,\n            'street_line1', a.street_line1,\n            'street_line2', a.street_line2,\n            'city', a.city,\n            'state_province', a.state_province,\n            'postal_code', a.postal_code,\n            'country', a.country,\n            'address_type', a.address_type,\n            'label', a.label,\n            'is_primary', a.is_primary,\n            'created_at', a.created_at\n        ) ORDER BY a.is_primary DESC, a.created_at ASC), '[]'::json)\n        FROM friends.friend_addresses a\n        WHERE a.friend_id = c.id\n    ) as addresses,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', url.external_id,\n            'url', url.url,\n            'url_type', url.url_type,\n            'label', url.label,\n            'created_at', url.created_at\n        ) ORDER BY url.created_at ASC), '[]'::json)\n        FROM friends.friend_urls url\n        WHERE url.friend_id = c.id\n    ) as urls,\n    -- Epic 1B: Extended sub-resources\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', d.external_id,\n            'date_value', d.date_value,\n            'year_known', d.year_known,\n            'date_type', d.date_type,\n            'label', d.label,\n            'created_at', d.created_at\n        ) ORDER BY d.date_type ASC, d.created_at ASC), '[]'::json)\n        FROM friends.friend_dates d\n        WHERE d.friend_id = c.id\n    ) as dates,\n    (\n        SELECT json_build_object(\n            'external_id', m.external_id,\n            'met_date', m.met_date,\n            'met_location', m.met_location,\n            'met_context', m.met_context,\n            'created_at', m.created_at,\n            'updated_at', m.updated_at\n        )\n        FROM friends.friend_met_info m\n        WHERE m.friend_id = c.id\n    ) as met_info,\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', sp.external_id,\n            'platform', sp.platform,\n            'profile_url', sp.profile_url,\n            'username', sp.username,\n            'created_at', sp.created_at\n        ) ORDER BY sp.platform ASC, sp.created_at ASC), '[]'::json)\n        FROM friends.friend_social_profiles sp\n        WHERE sp.friend_id = c.id\n    ) as social_profiles,\n    -- Professional history (employment records with date ranges)\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', ph.external_id,\n            'job_title', ph.job_title,\n            'organization', ph.organization,\n            'department', ph.department,\n            'notes', ph.notes,\n            'from_month', ph.from_month,\n            'from_year', ph.from_year,\n            'to_month', ph.to_month,\n            'to_year', ph.to_year,\n            'is_primary', ph.is_primary,\n            'created_at', ph.created_at\n        ) ORDER BY ph.is_primary DESC, ph.to_year IS NULL DESC, ph.from_year DESC, ph.from_month DESC), '[]'::json)\n        FROM friends.friend_professional_history ph\n        WHERE ph.friend_id = c.id\n    ) as professional_history,\n    -- Epic 1D: Relationships\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', r.external_id,\n            'related_friend_external_id', rc.external_id,\n            'related_friend_display_name', rc.display_name,\n            'related_friend_photo_thumbnail_url', rc.photo_thumbnail_url,\n            'relationship_type_id', r.relationship_type_id,\n            'relationship_type_label', rt.label,\n            'relationship_category', rt.category,\n            'notes', r.notes,\n            'created_at', r.created_at\n        ) ORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC), '[]'::json)\n        FROM friends.friend_relationships r\n        INNER JOIN friends.friends rc ON r.related_friend_id = rc.id AND rc.deleted_at IS NULL\n        INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\n        WHERE r.friend_id = c.id\n    ) as relationships,\n    -- Epic 4: Circles\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', ci.external_id,\n            'name', ci.name,\n            'color', ci.color\n        ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)\n        FROM friends.circles ci\n        INNER JOIN friends.friend_circles fc ON fc.circle_id = ci.id\n        WHERE fc.friend_id = c.id\n    ) as circles\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.display_name,
 *     c.nickname,
 *     c.name_prefix,
 *     c.name_first,
 *     c.name_middle,
 *     c.name_last,
 *     c.name_suffix,
 *     c.maiden_name,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.interests,
 *     -- Epic 4: Categorization & Organization
 *     c.is_favorite,
 *     c.archived_at,
 *     c.archive_reason,
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
 *         FROM friends.friend_phones p
 *         WHERE p.friend_id = c.id
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
 *         FROM friends.friend_emails e
 *         WHERE e.friend_id = c.id
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
 *         FROM friends.friend_addresses a
 *         WHERE a.friend_id = c.id
 *     ) as addresses,
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', url.external_id,
 *             'url', url.url,
 *             'url_type', url.url_type,
 *             'label', url.label,
 *             'created_at', url.created_at
 *         ) ORDER BY url.created_at ASC), '[]'::json)
 *         FROM friends.friend_urls url
 *         WHERE url.friend_id = c.id
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
 *         FROM friends.friend_dates d
 *         WHERE d.friend_id = c.id
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
 *         FROM friends.friend_met_info m
 *         WHERE m.friend_id = c.id
 *     ) as met_info,
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', sp.external_id,
 *             'platform', sp.platform,
 *             'profile_url', sp.profile_url,
 *             'username', sp.username,
 *             'created_at', sp.created_at
 *         ) ORDER BY sp.platform ASC, sp.created_at ASC), '[]'::json)
 *         FROM friends.friend_social_profiles sp
 *         WHERE sp.friend_id = c.id
 *     ) as social_profiles,
 *     -- Professional history (employment records with date ranges)
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', ph.external_id,
 *             'job_title', ph.job_title,
 *             'organization', ph.organization,
 *             'department', ph.department,
 *             'notes', ph.notes,
 *             'from_month', ph.from_month,
 *             'from_year', ph.from_year,
 *             'to_month', ph.to_month,
 *             'to_year', ph.to_year,
 *             'is_primary', ph.is_primary,
 *             'created_at', ph.created_at
 *         ) ORDER BY ph.is_primary DESC, ph.to_year IS NULL DESC, ph.from_year DESC, ph.from_month DESC), '[]'::json)
 *         FROM friends.friend_professional_history ph
 *         WHERE ph.friend_id = c.id
 *     ) as professional_history,
 *     -- Epic 1D: Relationships
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', r.external_id,
 *             'related_friend_external_id', rc.external_id,
 *             'related_friend_display_name', rc.display_name,
 *             'related_friend_photo_thumbnail_url', rc.photo_thumbnail_url,
 *             'relationship_type_id', r.relationship_type_id,
 *             'relationship_type_label', rt.label,
 *             'relationship_category', rt.category,
 *             'notes', r.notes,
 *             'created_at', r.created_at
 *         ) ORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC), '[]'::json)
 *         FROM friends.friend_relationships r
 *         INNER JOIN friends.friends rc ON r.related_friend_id = rc.id AND rc.deleted_at IS NULL
 *         INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
 *         WHERE r.friend_id = c.id
 *     ) as relationships,
 *     -- Epic 4: Circles
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', ci.external_id,
 *             'name', ci.name,
 *             'color', ci.color
 *         ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)
 *         FROM friends.circles ci
 *         INNER JOIN friends.friend_circles fc ON fc.circle_id = ci.id
 *         WHERE fc.friend_id = c.id
 *     ) as circles
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getFriendById = new PreparedQuery<IGetFriendByIdParams,IGetFriendByIdResult>(getFriendByIdIR);


/** 'GetFriendInternalId' parameters type */
export interface IGetFriendInternalIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetFriendInternalId' return type */
export interface IGetFriendInternalIdResult {
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetFriendInternalId' query type */
export interface IGetFriendInternalIdQuery {
  params: IGetFriendInternalIdParams;
  result: IGetFriendInternalIdResult;
}

const getFriendInternalIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":101,"b":117}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":141,"b":155}]}],"statement":"SELECT c.id\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT c.id
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getFriendInternalId = new PreparedQuery<IGetFriendInternalIdParams,IGetFriendInternalIdResult>(getFriendInternalIdIR);


/** 'GetFriendsByUserId' parameters type */
export interface IGetFriendsByUserIdParams {
  archivedFilter?: string | null | void;
  favoritesOnly?: boolean | null | void;
  offset?: NumberOrString | null | void;
  pageSize?: NumberOrString | null | void;
  sortBy?: string | null | void;
  sortOrder?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetFriendsByUserId' return type */
export interface IGetFriendsByUserIdResult {
  /** When this friend was archived (null if not archived) */
  archived_at: Date | null;
  birthday: Date | null;
  circles: Json | null;
  created_at: Date;
  department: string | null;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this friend is marked as a favorite */
  is_favorite: boolean;
  job_title: string | null;
  /** Maiden name or birth name for the friend */
  maiden_name: string | null;
  /** Informal name or nickname for the friend */
  nickname: string | null;
  organization: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  primary_city: string | null;
  primary_country: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  total_count: number | null;
  updated_at: Date;
}

/** 'GetFriendsByUserId' query type */
export interface IGetFriendsByUserIdQuery {
  params: IGetFriendsByUserIdParams;
  result: IGetFriendsByUserIdResult;
}

const getFriendsByUserIdIR: any = {"usedParamSet":{"userExternalId":true,"archivedFilter":true,"favoritesOnly":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":358,"b":372}]},{"name":"archivedFilter","required":false,"transform":{"type":"scalar"},"locs":[{"a":505,"b":519},{"a":558,"b":572}]},{"name":"favoritesOnly","required":false,"transform":{"type":"scalar"},"locs":[{"a":745,"b":758}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":2789,"b":2795},{"a":2858,"b":2864},{"a":2950,"b":2956},{"a":3044,"b":3050},{"a":3132,"b":3138},{"a":3222,"b":3228},{"a":3310,"b":3316}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":2887,"b":2896},{"a":2979,"b":2988},{"a":3071,"b":3080},{"a":3159,"b":3168},{"a":3249,"b":3258},{"a":3337,"b":3346}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":3391,"b":3399}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3408,"b":3414}]}],"statement":"WITH friend_list AS (\n    SELECT\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.nickname,\n        c.maiden_name,\n        c.photo_thumbnail_url,\n        c.is_favorite,\n        c.archived_at,\n        c.created_at,\n        c.updated_at\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      -- Epic 4: Archive filter (default excludes archived)\n      AND (\n        CASE\n          WHEN :archivedFilter = 'include' THEN true\n          WHEN :archivedFilter = 'only' THEN c.archived_at IS NOT NULL\n          ELSE c.archived_at IS NULL  -- 'exclude' or default\n        END\n      )\n      -- Epic 4: Favorites filter\n      AND (NOT :favoritesOnly OR c.is_favorite = true)\n),\ntotal AS (\n    SELECT COUNT(*)::int as total_count FROM friend_list\n)\nSELECT\n    cl.external_id,\n    cl.display_name,\n    cl.nickname,\n    cl.maiden_name,\n    cl.photo_thumbnail_url,\n    cl.is_favorite,\n    cl.archived_at,\n    cl.created_at,\n    cl.updated_at,\n    (SELECT e.email_address FROM friends.friend_emails e WHERE e.friend_id = cl.id AND e.is_primary = true LIMIT 1) as primary_email,\n    (SELECT p.phone_number FROM friends.friend_phones p WHERE p.friend_id = cl.id AND p.is_primary = true LIMIT 1) as primary_phone,\n    -- Professional info from primary professional history\n    (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = cl.id AND ph.is_primary = true LIMIT 1) as job_title,\n    (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = cl.id AND ph.is_primary = true LIMIT 1) as organization,\n    (SELECT ph.department FROM friends.friend_professional_history ph WHERE ph.friend_id = cl.id AND ph.is_primary = true LIMIT 1) as department,\n    -- Extended fields for dynamic columns\n    (SELECT a.city FROM friends.friend_addresses a WHERE a.friend_id = cl.id AND a.is_primary = true LIMIT 1) as primary_city,\n    (SELECT a.country FROM friends.friend_addresses a WHERE a.friend_id = cl.id AND a.is_primary = true LIMIT 1) as primary_country,\n    (SELECT d.date_value FROM friends.friend_dates d WHERE d.friend_id = cl.id AND d.date_type = 'birthday' LIMIT 1) as birthday,\n    -- Epic 4: Circles for each friend\n    (\n        SELECT COALESCE(json_agg(json_build_object(\n            'external_id', ci.external_id,\n            'name', ci.name,\n            'color', ci.color\n        ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)\n        FROM friends.circles ci\n        INNER JOIN friends.friend_circles fc ON fc.circle_id = ci.id\n        WHERE fc.friend_id = cl.id\n    ) as circles,\n    t.total_count\nFROM friend_list cl\nCROSS JOIN total t\nORDER BY\n    -- Favorites first when sorting by name\n    CASE WHEN :sortBy = 'display_name' THEN cl.is_favorite END DESC,\n    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN cl.display_name END ASC,\n    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN cl.display_name END DESC,\n    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN cl.created_at END ASC,\n    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN cl.created_at END DESC,\n    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN cl.updated_at END ASC,\n    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN cl.updated_at END DESC\nLIMIT :pageSize\nOFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * WITH friend_list AS (
 *     SELECT
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.nickname,
 *         c.maiden_name,
 *         c.photo_thumbnail_url,
 *         c.is_favorite,
 *         c.archived_at,
 *         c.created_at,
 *         c.updated_at
 *     FROM friends.friends c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       -- Epic 4: Archive filter (default excludes archived)
 *       AND (
 *         CASE
 *           WHEN :archivedFilter = 'include' THEN true
 *           WHEN :archivedFilter = 'only' THEN c.archived_at IS NOT NULL
 *           ELSE c.archived_at IS NULL  -- 'exclude' or default
 *         END
 *       )
 *       -- Epic 4: Favorites filter
 *       AND (NOT :favoritesOnly OR c.is_favorite = true)
 * ),
 * total AS (
 *     SELECT COUNT(*)::int as total_count FROM friend_list
 * )
 * SELECT
 *     cl.external_id,
 *     cl.display_name,
 *     cl.nickname,
 *     cl.maiden_name,
 *     cl.photo_thumbnail_url,
 *     cl.is_favorite,
 *     cl.archived_at,
 *     cl.created_at,
 *     cl.updated_at,
 *     (SELECT e.email_address FROM friends.friend_emails e WHERE e.friend_id = cl.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     (SELECT p.phone_number FROM friends.friend_phones p WHERE p.friend_id = cl.id AND p.is_primary = true LIMIT 1) as primary_phone,
 *     -- Professional info from primary professional history
 *     (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = cl.id AND ph.is_primary = true LIMIT 1) as job_title,
 *     (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = cl.id AND ph.is_primary = true LIMIT 1) as organization,
 *     (SELECT ph.department FROM friends.friend_professional_history ph WHERE ph.friend_id = cl.id AND ph.is_primary = true LIMIT 1) as department,
 *     -- Extended fields for dynamic columns
 *     (SELECT a.city FROM friends.friend_addresses a WHERE a.friend_id = cl.id AND a.is_primary = true LIMIT 1) as primary_city,
 *     (SELECT a.country FROM friends.friend_addresses a WHERE a.friend_id = cl.id AND a.is_primary = true LIMIT 1) as primary_country,
 *     (SELECT d.date_value FROM friends.friend_dates d WHERE d.friend_id = cl.id AND d.date_type = 'birthday' LIMIT 1) as birthday,
 *     -- Epic 4: Circles for each friend
 *     (
 *         SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', ci.external_id,
 *             'name', ci.name,
 *             'color', ci.color
 *         ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)
 *         FROM friends.circles ci
 *         INNER JOIN friends.friend_circles fc ON fc.circle_id = ci.id
 *         WHERE fc.friend_id = cl.id
 *     ) as circles,
 *     t.total_count
 * FROM friend_list cl
 * CROSS JOIN total t
 * ORDER BY
 *     -- Favorites first when sorting by name
 *     CASE WHEN :sortBy = 'display_name' THEN cl.is_favorite END DESC,
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
export const getFriendsByUserId = new PreparedQuery<IGetFriendsByUserIdParams,IGetFriendsByUserIdResult>(getFriendsByUserIdIR);


/** 'CreateFriend' parameters type */
export interface ICreateFriendParams {
  displayName?: string | null | void;
  interests?: string | null | void;
  maidenName?: string | null | void;
  nameFirst?: string | null | void;
  nameLast?: string | null | void;
  nameMiddle?: string | null | void;
  namePrefix?: string | null | void;
  nameSuffix?: string | null | void;
  nickname?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateFriend' return type */
export interface ICreateFriendResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Interests and hobbies (free-form text) */
  interests: string | null;
  /** Maiden name or birth name for the friend */
  maiden_name: string | null;
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
  /** Informal name or nickname for the friend */
  nickname: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
}

/** 'CreateFriend' query type */
export interface ICreateFriendQuery {
  params: ICreateFriendParams;
  result: ICreateFriendResult;
}

const createFriendIR: any = {"usedParamSet":{"displayName":true,"nickname":true,"namePrefix":true,"nameFirst":true,"nameMiddle":true,"nameLast":true,"nameSuffix":true,"maidenName":true,"interests":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":211,"b":222}]},{"name":"nickname","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":237}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":244,"b":254}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":261,"b":270}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":277,"b":287}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":294,"b":302}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":309,"b":319}]},{"name":"maidenName","required":false,"transform":{"type":"scalar"},"locs":[{"a":326,"b":336}]},{"name":"interests","required":false,"transform":{"type":"scalar"},"locs":[{"a":343,"b":352}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":408}]}],"statement":"INSERT INTO friends.friends (\n    user_id,\n    display_name,\n    nickname,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix,\n    maiden_name,\n    interests\n)\nSELECT\n    u.id,\n    :displayName,\n    :nickname,\n    :namePrefix,\n    :nameFirst,\n    :nameMiddle,\n    :nameLast,\n    :nameSuffix,\n    :maidenName,\n    :interests\nFROM auth.users u\nWHERE u.external_id = :userExternalId\nRETURNING\n    external_id,\n    display_name,\n    nickname,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix,\n    maiden_name,\n    photo_url,\n    photo_thumbnail_url,\n    interests,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friends (
 *     user_id,
 *     display_name,
 *     nickname,
 *     name_prefix,
 *     name_first,
 *     name_middle,
 *     name_last,
 *     name_suffix,
 *     maiden_name,
 *     interests
 * )
 * SELECT
 *     u.id,
 *     :displayName,
 *     :nickname,
 *     :namePrefix,
 *     :nameFirst,
 *     :nameMiddle,
 *     :nameLast,
 *     :nameSuffix,
 *     :maidenName,
 *     :interests
 * FROM auth.users u
 * WHERE u.external_id = :userExternalId
 * RETURNING
 *     external_id,
 *     display_name,
 *     nickname,
 *     name_prefix,
 *     name_first,
 *     name_middle,
 *     name_last,
 *     name_suffix,
 *     maiden_name,
 *     photo_url,
 *     photo_thumbnail_url,
 *     interests,
 *     created_at,
 *     updated_at
 * ```
 */
export const createFriend = new PreparedQuery<ICreateFriendParams,ICreateFriendResult>(createFriendIR);


/** 'UpdateFriend' parameters type */
export interface IUpdateFriendParams {
  displayName?: string | null | void;
  friendExternalId?: string | null | void;
  interests?: string | null | void;
  maidenName?: string | null | void;
  nameFirst?: string | null | void;
  nameLast?: string | null | void;
  nameMiddle?: string | null | void;
  namePrefix?: string | null | void;
  nameSuffix?: string | null | void;
  nickname?: string | null | void;
  updateInterests?: boolean | null | void;
  updateMaidenName?: boolean | null | void;
  updateNameFirst?: boolean | null | void;
  updateNameLast?: boolean | null | void;
  updateNameMiddle?: boolean | null | void;
  updateNamePrefix?: boolean | null | void;
  updateNameSuffix?: boolean | null | void;
  updateNickname?: boolean | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateFriend' return type */
export interface IUpdateFriendResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Interests and hobbies (free-form text) */
  interests: string | null;
  /** Maiden name or birth name for the friend */
  maiden_name: string | null;
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
  /** Informal name or nickname for the friend */
  nickname: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
}

/** 'UpdateFriend' query type */
export interface IUpdateFriendQuery {
  params: IUpdateFriendParams;
  result: IUpdateFriendResult;
}

const updateFriendIR: any = {"usedParamSet":{"displayName":true,"updateNickname":true,"nickname":true,"updateNamePrefix":true,"namePrefix":true,"updateNameFirst":true,"nameFirst":true,"updateNameMiddle":true,"nameMiddle":true,"updateNameLast":true,"nameLast":true,"updateNameSuffix":true,"nameSuffix":true,"updateMaidenName":true,"maidenName":true,"updateInterests":true,"interests":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":57,"b":68}]},{"name":"updateNickname","required":false,"transform":{"type":"scalar"},"locs":[{"a":113,"b":127}]},{"name":"nickname","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":142}]},{"name":"updateNamePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":193,"b":209}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":216,"b":226}]},{"name":"updateNameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":279,"b":294}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":301,"b":310}]},{"name":"updateNameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":363,"b":379}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":386,"b":396}]},{"name":"updateNameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":448,"b":462}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":469,"b":477}]},{"name":"updateNameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":529,"b":545}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":552,"b":562}]},{"name":"updateMaidenName","required":false,"transform":{"type":"scalar"},"locs":[{"a":616,"b":632}]},{"name":"maidenName","required":false,"transform":{"type":"scalar"},"locs":[{"a":639,"b":649}]},{"name":"updateInterests","required":false,"transform":{"type":"scalar"},"locs":[{"a":701,"b":716}]},{"name":"interests","required":false,"transform":{"type":"scalar"},"locs":[{"a":723,"b":732}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":795,"b":811}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":858,"b":872}]}],"statement":"UPDATE friends.friends c\nSET\n    display_name = COALESCE(:displayName, c.display_name),\n    nickname = CASE WHEN :updateNickname THEN :nickname ELSE c.nickname END,\n    name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,\n    name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,\n    name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,\n    name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,\n    name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END,\n    maiden_name = CASE WHEN :updateMaidenName THEN :maidenName ELSE c.maiden_name END,\n    interests = CASE WHEN :updateInterests THEN :interests ELSE c.interests END\nFROM auth.users u\nWHERE c.external_id = :friendExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.display_name,\n    c.nickname,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.maiden_name,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.interests,\n    c.created_at,\n    c.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friends c
 * SET
 *     display_name = COALESCE(:displayName, c.display_name),
 *     nickname = CASE WHEN :updateNickname THEN :nickname ELSE c.nickname END,
 *     name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,
 *     name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,
 *     name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,
 *     name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,
 *     name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END,
 *     maiden_name = CASE WHEN :updateMaidenName THEN :maidenName ELSE c.maiden_name END,
 *     interests = CASE WHEN :updateInterests THEN :interests ELSE c.interests END
 * FROM auth.users u
 * WHERE c.external_id = :friendExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     c.external_id,
 *     c.display_name,
 *     c.nickname,
 *     c.name_prefix,
 *     c.name_first,
 *     c.name_middle,
 *     c.name_last,
 *     c.name_suffix,
 *     c.maiden_name,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.interests,
 *     c.created_at,
 *     c.updated_at
 * ```
 */
export const updateFriend = new PreparedQuery<IUpdateFriendParams,IUpdateFriendResult>(updateFriendIR);


/** 'SoftDeleteFriend' parameters type */
export interface ISoftDeleteFriendParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SoftDeleteFriend' return type */
export interface ISoftDeleteFriendResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'SoftDeleteFriend' query type */
export interface ISoftDeleteFriendQuery {
  params: ISoftDeleteFriendParams;
  result: ISoftDeleteFriendResult;
}

const softDeleteFriendIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":100,"b":116}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":163,"b":177}]}],"statement":"UPDATE friends.friends c\nSET deleted_at = CURRENT_TIMESTAMP\nFROM auth.users u\nWHERE c.external_id = :friendExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING c.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friends c
 * SET deleted_at = CURRENT_TIMESTAMP
 * FROM auth.users u
 * WHERE c.external_id = :friendExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING c.external_id
 * ```
 */
export const softDeleteFriend = new PreparedQuery<ISoftDeleteFriendParams,ISoftDeleteFriendResult>(softDeleteFriendIR);


/** 'UpdateFriendPhoto' parameters type */
export interface IUpdateFriendPhotoParams {
  friendExternalId?: string | null | void;
  photoThumbnailUrl?: string | null | void;
  photoUrl?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateFriendPhoto' return type */
export interface IUpdateFriendPhotoResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
}

/** 'UpdateFriendPhoto' query type */
export interface IUpdateFriendPhotoQuery {
  params: IUpdateFriendPhotoParams;
  result: IUpdateFriendPhotoResult;
}

const updateFriendPhotoIR: any = {"usedParamSet":{"photoUrl":true,"photoThumbnailUrl":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"photoUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":45,"b":53}]},{"name":"photoThumbnailUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":82,"b":99}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":141,"b":157}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":218}]}],"statement":"UPDATE friends.friends c\nSET\n    photo_url = :photoUrl,\n    photo_thumbnail_url = :photoThumbnailUrl\nFROM auth.users u\nWHERE c.external_id = :friendExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.photo_url,\n    c.photo_thumbnail_url                                                                                                                                                                                                           "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friends c
 * SET
 *     photo_url = :photoUrl,
 *     photo_thumbnail_url = :photoThumbnailUrl
 * FROM auth.users u
 * WHERE c.external_id = :friendExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     c.external_id,
 *     c.photo_url,
 *     c.photo_thumbnail_url                                                                                                                                                                                                           
 * ```
 */
export const updateFriendPhoto = new PreparedQuery<IUpdateFriendPhotoParams,IUpdateFriendPhotoResult>(updateFriendPhotoIR);


/** 'ToggleFavorite' parameters type */
export interface IToggleFavoriteParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ToggleFavorite' return type */
export interface IToggleFavoriteResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this friend is marked as a favorite */
  is_favorite: boolean;
}

/** 'ToggleFavorite' query type */
export interface IToggleFavoriteQuery {
  params: IToggleFavoriteParams;
  result: IToggleFavoriteResult;
}

const toggleFavoriteIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":101,"b":117}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":164,"b":178}]}],"statement":"UPDATE friends.friends c\nSET is_favorite = NOT c.is_favorite\nFROM auth.users u\nWHERE c.external_id = :friendExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING c.external_id, c.is_favorite"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friends c
 * SET is_favorite = NOT c.is_favorite
 * FROM auth.users u
 * WHERE c.external_id = :friendExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING c.external_id, c.is_favorite
 * ```
 */
export const toggleFavorite = new PreparedQuery<IToggleFavoriteParams,IToggleFavoriteResult>(toggleFavoriteIR);


/** 'SetFavorite' parameters type */
export interface ISetFavoriteParams {
  friendExternalId?: string | null | void;
  isFavorite?: boolean | null | void;
  userExternalId?: string | null | void;
}

/** 'SetFavorite' return type */
export interface ISetFavoriteResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this friend is marked as a favorite */
  is_favorite: boolean;
}

/** 'SetFavorite' query type */
export interface ISetFavoriteQuery {
  params: ISetFavoriteParams;
  result: ISetFavoriteResult;
}

const setFavoriteIR: any = {"usedParamSet":{"isFavorite":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"isFavorite","required":false,"transform":{"type":"scalar"},"locs":[{"a":43,"b":53}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":95,"b":111}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":158,"b":172}]}],"statement":"UPDATE friends.friends c\nSET is_favorite = :isFavorite\nFROM auth.users u\nWHERE c.external_id = :friendExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING c.external_id, c.is_favorite"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friends c
 * SET is_favorite = :isFavorite
 * FROM auth.users u
 * WHERE c.external_id = :friendExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING c.external_id, c.is_favorite
 * ```
 */
export const setFavorite = new PreparedQuery<ISetFavoriteParams,ISetFavoriteResult>(setFavoriteIR);


/** 'ArchiveFriend' parameters type */
export interface IArchiveFriendParams {
  archiveReason?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ArchiveFriend' return type */
export interface IArchiveFriendResult {
  /** Optional reason for archiving this friend */
  archive_reason: string | null;
  /** When this friend was archived (null if not archived) */
  archived_at: Date | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'ArchiveFriend' query type */
export interface IArchiveFriendQuery {
  params: IArchiveFriendParams;
  result: IArchiveFriendResult;
}

const archiveFriendIR: any = {"usedParamSet":{"archiveReason":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"archiveReason","required":false,"transform":{"type":"scalar"},"locs":[{"a":87,"b":100}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":142,"b":158}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":205,"b":219}]}],"statement":"UPDATE friends.friends c\nSET\n    archived_at = CURRENT_TIMESTAMP,\n    archive_reason = :archiveReason\nFROM auth.users u\nWHERE c.external_id = :friendExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND c.archived_at IS NULL\nRETURNING c.external_id, c.archived_at, c.archive_reason"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friends c
 * SET
 *     archived_at = CURRENT_TIMESTAMP,
 *     archive_reason = :archiveReason
 * FROM auth.users u
 * WHERE c.external_id = :friendExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND c.archived_at IS NULL
 * RETURNING c.external_id, c.archived_at, c.archive_reason
 * ```
 */
export const archiveFriend = new PreparedQuery<IArchiveFriendParams,IArchiveFriendResult>(archiveFriendIR);


/** 'UnarchiveFriend' parameters type */
export interface IUnarchiveFriendParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UnarchiveFriend' return type */
export interface IUnarchiveFriendResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'UnarchiveFriend' query type */
export interface IUnarchiveFriendQuery {
  params: IUnarchiveFriendParams;
  result: IUnarchiveFriendResult;
}

const unarchiveFriendIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":119,"b":135}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":182,"b":196}]}],"statement":"UPDATE friends.friends c\nSET\n    archived_at = NULL,\n    archive_reason = NULL\nFROM auth.users u\nWHERE c.external_id = :friendExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND c.archived_at IS NOT NULL\nRETURNING c.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friends c
 * SET
 *     archived_at = NULL,
 *     archive_reason = NULL
 * FROM auth.users u
 * WHERE c.external_id = :friendExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND c.archived_at IS NOT NULL
 * RETURNING c.external_id
 * ```
 */
export const unarchiveFriend = new PreparedQuery<IUnarchiveFriendParams,IUnarchiveFriendResult>(unarchiveFriendIR);


