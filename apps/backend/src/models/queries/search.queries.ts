/** Types generated for queries found in "src/models/queries/search.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'FullTextSearchContacts' parameters type */
export interface IFullTextSearchContactsParams {
  limit?: NumberOrString | null | void;
  query?: string | null | void;
  userExternalId?: string | null | void;
  wildcardQuery?: string | null | void;
}

/** 'FullTextSearchContacts' return type */
export interface IFullTextSearchContactsResult {
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  headline: string | null;
  /** Job title / position */
  job_title: string | null;
  match_source: string | null;
  /** Company / organization name */
  organization: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  rank: number | null;
}

/** 'FullTextSearchContacts' query type */
export interface IFullTextSearchContactsQuery {
  params: IFullTextSearchContactsParams;
  result: IFullTextSearchContactsResult;
}

const fullTextSearchContactsIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"limit":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":350,"b":355},{"a":528,"b":533},{"a":1195,"b":1200},{"a":1646,"b":1651},{"a":2250,"b":2255}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1008,"b":1021},{"a":1325,"b":1338},{"a":1437,"b":1450}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1478,"b":1492}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":2777,"b":2782}]}],"statement":"WITH matching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN contacts.contact_relationships r\n        ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_met_info m\n        ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on contact fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\nSELECT\n    mc.external_id,\n    mc.display_name,\n    mc.photo_thumbnail_url,\n    mc.organization,\n    mc.job_title,\n    mc.fts_rank as rank,\n    mc.match_source,\n    -- Generate headline/snippet for matched content\n    ts_headline(\n        'english',\n        COALESCE(mc.display_name, '') || ' ' ||\n        COALESCE(mc.organization, '') || ' ' ||\n        COALESCE(mc.work_notes, ''),\n        websearch_to_tsquery('english', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    -- Get primary email\n    (SELECT e.email_address FROM contacts.contact_emails e\n     WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n    -- Get primary phone\n    (SELECT p.phone_number FROM contacts.contact_phones p\n     WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM matching_contacts mc\nORDER BY mc.fts_rank DESC, mc.display_name ASC\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * WITH matching_contacts AS (
 *     SELECT DISTINCT ON (c.id)
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         c.organization,
 *         c.job_title,
 *         c.work_notes,
 *         -- Calculate relevance score from full-text search
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
 *         -- Determine match source (using joined tables for efficiency)
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'
 *             WHEN e.id IS NOT NULL THEN 'email'
 *             WHEN p.id IS NOT NULL THEN 'phone'
 *             WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'
 *             ELSE NULL
 *         END as match_source
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     -- LEFT JOINs for efficient matching (avoids correlated subqueries)
 *     LEFT JOIN contacts.contact_emails e
 *         ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_phones p
 *         ON p.contact_id = c.id
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN contacts.contact_relationships r
 *         ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_met_info m
 *         ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           -- Full-text search on contact fields
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           -- OR matches from joined tables
 *           OR e.id IS NOT NULL
 *           OR p.id IS NOT NULL
 *           OR r.id IS NOT NULL
 *           OR m.id IS NOT NULL
 *       )
 * )
 * SELECT
 *     mc.external_id,
 *     mc.display_name,
 *     mc.photo_thumbnail_url,
 *     mc.organization,
 *     mc.job_title,
 *     mc.fts_rank as rank,
 *     mc.match_source,
 *     -- Generate headline/snippet for matched content
 *     ts_headline(
 *         'english',
 *         COALESCE(mc.display_name, '') || ' ' ||
 *         COALESCE(mc.organization, '') || ' ' ||
 *         COALESCE(mc.work_notes, ''),
 *         websearch_to_tsquery('english', :query),
 *         'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
 *     ) as headline,
 *     -- Get primary email
 *     (SELECT e.email_address FROM contacts.contact_emails e
 *      WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     -- Get primary phone
 *     (SELECT p.phone_number FROM contacts.contact_phones p
 *      WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
 * FROM matching_contacts mc
 * ORDER BY mc.fts_rank DESC, mc.display_name ASC
 * LIMIT :limit
 * ```
 */
export const fullTextSearchContacts = new PreparedQuery<IFullTextSearchContactsParams,IFullTextSearchContactsResult>(fullTextSearchContactsIR);


/** 'PaginatedFullTextSearch' parameters type */
export interface IPaginatedFullTextSearchParams {
  offset?: NumberOrString | null | void;
  pageSize?: NumberOrString | null | void;
  query?: string | null | void;
  sortBy?: string | null | void;
  sortOrder?: string | null | void;
  userExternalId?: string | null | void;
  wildcardQuery?: string | null | void;
}

/** 'PaginatedFullTextSearch' return type */
export interface IPaginatedFullTextSearchResult {
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  headline: string | null;
  /** Job title / position */
  job_title: string | null;
  match_source: string | null;
  /** Company / organization name */
  organization: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  rank: number | null;
  total_count: number | null;
}

/** 'PaginatedFullTextSearch' query type */
export interface IPaginatedFullTextSearchQuery {
  params: IPaginatedFullTextSearchParams;
  result: IPaginatedFullTextSearchResult;
}

const paginatedFullTextSearchIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":399},{"a":572,"b":577},{"a":1239,"b":1244},{"a":1690,"b":1695},{"a":2284,"b":2289}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1052,"b":1065},{"a":1369,"b":1382},{"a":1481,"b":1494}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1522,"b":1536}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":2825,"b":2831},{"a":2916,"b":2922},{"a":3005,"b":3011},{"a":3101,"b":3107},{"a":3199,"b":3205},{"a":3293,"b":3299},{"a":3385,"b":3391},{"a":3479,"b":3485}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":2851,"b":2860},{"a":2942,"b":2951},{"a":3034,"b":3043},{"a":3130,"b":3139},{"a":3226,"b":3235},{"a":3320,"b":3329},{"a":3412,"b":3421},{"a":3506,"b":3515}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":3591,"b":3599}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3612,"b":3618}]}],"statement":"WITH matching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        c.created_at,\n        c.updated_at,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN contacts.contact_relationships r\n        ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_met_info m\n        ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on contact fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_contacts\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        -- Generate headline/snippet for matched content\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE(mc.work_notes, ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        -- Get primary email\n        (SELECT e.email_address FROM contacts.contact_emails e\n         WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        -- Get primary phone\n        (SELECT p.phone_number FROM contacts.contact_phones p\n         WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_contacts mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

/**
 * Query generated from SQL:
 * ```
 * WITH matching_contacts AS (
 *     SELECT DISTINCT ON (c.id)
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         c.organization,
 *         c.job_title,
 *         c.work_notes,
 *         c.created_at,
 *         c.updated_at,
 *         -- Calculate relevance score from full-text search
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
 *         -- Determine match source (using joined tables for efficiency)
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'
 *             WHEN e.id IS NOT NULL THEN 'email'
 *             WHEN p.id IS NOT NULL THEN 'phone'
 *             WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'
 *             ELSE NULL
 *         END as match_source
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     -- LEFT JOINs for efficient matching (avoids correlated subqueries)
 *     LEFT JOIN contacts.contact_emails e
 *         ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_phones p
 *         ON p.contact_id = c.id
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN contacts.contact_relationships r
 *         ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_met_info m
 *         ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           -- Full-text search on contact fields
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           -- OR matches from joined tables
 *           OR e.id IS NOT NULL
 *           OR p.id IS NOT NULL
 *           OR r.id IS NOT NULL
 *           OR m.id IS NOT NULL
 *       )
 * ),
 * total_count AS (
 *     SELECT COUNT(*)::int as count FROM matching_contacts
 * ),
 * sorted_results AS (
 *     SELECT
 *         mc.*,
 *         -- Generate headline/snippet for matched content
 *         ts_headline(
 *             'english',
 *             COALESCE(mc.display_name, '') || ' ' ||
 *             COALESCE(mc.organization, '') || ' ' ||
 *             COALESCE(mc.work_notes, ''),
 *             websearch_to_tsquery('english', :query),
 *             'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
 *         ) as headline,
 *         -- Get primary email
 *         (SELECT e.email_address FROM contacts.contact_emails e
 *          WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
 *         -- Get primary phone
 *         (SELECT p.phone_number FROM contacts.contact_phones p
 *          WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
 *     FROM matching_contacts mc
 *     ORDER BY
 *         CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,
 *         CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,
 *         CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,
 *         CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,
 *         CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,
 *         CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,
 *         CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,
 *         CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,
 *         mc.display_name ASC
 *     LIMIT :pageSize
 *     OFFSET :offset
 * )
 * SELECT
 *     sr.external_id,
 *     sr.display_name,
 *     sr.photo_thumbnail_url,
 *     sr.organization,
 *     sr.job_title,
 *     sr.fts_rank as rank,
 *     sr.match_source,
 *     sr.headline,
 *     sr.primary_email,
 *     sr.primary_phone,
 *     tc.count as total_count
 * FROM sorted_results sr
 * CROSS JOIN total_count tc
 * ```
 */
export const paginatedFullTextSearch = new PreparedQuery<IPaginatedFullTextSearchParams,IPaginatedFullTextSearchResult>(paginatedFullTextSearchIR);


/** 'GetRecentSearches' parameters type */
export interface IGetRecentSearchesParams {
  limit?: NumberOrString | null | void;
  userExternalId?: string | null | void;
}

/** 'GetRecentSearches' return type */
export interface IGetRecentSearchesResult {
  /** The search query string */
  query: string;
  /** When the search was performed */
  searched_at: Date;
}

/** 'GetRecentSearches' query type */
export interface IGetRecentSearchesQuery {
  params: IGetRecentSearchesParams;
  result: IGetRecentSearchesResult;
}

const getRecentSearchesIR: any = {"usedParamSet":{"userExternalId":true,"limit":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":145}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":182,"b":187}]}],"statement":"SELECT sh.query, sh.searched_at\nFROM contacts.search_history sh\nINNER JOIN auth.users u ON sh.user_id = u.id\nWHERE u.external_id = :userExternalId\nORDER BY sh.searched_at DESC\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * SELECT sh.query, sh.searched_at
 * FROM contacts.search_history sh
 * INNER JOIN auth.users u ON sh.user_id = u.id
 * WHERE u.external_id = :userExternalId
 * ORDER BY sh.searched_at DESC
 * LIMIT :limit
 * ```
 */
export const getRecentSearches = new PreparedQuery<IGetRecentSearchesParams,IGetRecentSearchesResult>(getRecentSearchesIR);


/** 'AddRecentSearch' parameters type */
export interface IAddRecentSearchParams {
  query?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'AddRecentSearch' return type */
export interface IAddRecentSearchResult {
  /** Internal sequential ID */
  id: number;
  /** The search query string */
  query: string;
  /** When the search was performed */
  searched_at: Date;
}

/** 'AddRecentSearch' query type */
export interface IAddRecentSearchQuery {
  params: IAddRecentSearchParams;
  result: IAddRecentSearchResult;
}

const addRecentSearchIR: any = {"usedParamSet":{"query":true,"userExternalId":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":79,"b":84}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":145,"b":159}]}],"statement":"INSERT INTO contacts.search_history (user_id, query, searched_at)\nSELECT u.id, :query, CURRENT_TIMESTAMP\nFROM auth.users u\nWHERE u.external_id = :userExternalId\nON CONFLICT (user_id, query)\nDO UPDATE SET searched_at = CURRENT_TIMESTAMP\nRETURNING id, query, searched_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.search_history (user_id, query, searched_at)
 * SELECT u.id, :query, CURRENT_TIMESTAMP
 * FROM auth.users u
 * WHERE u.external_id = :userExternalId
 * ON CONFLICT (user_id, query)
 * DO UPDATE SET searched_at = CURRENT_TIMESTAMP
 * RETURNING id, query, searched_at
 * ```
 */
export const addRecentSearch = new PreparedQuery<IAddRecentSearchParams,IAddRecentSearchResult>(addRecentSearchIR);


/** 'DeleteRecentSearch' parameters type */
export interface IDeleteRecentSearchParams {
  query?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteRecentSearch' return type */
export interface IDeleteRecentSearchResult {
  /** Internal sequential ID */
  id: number;
}

/** 'DeleteRecentSearch' query type */
export interface IDeleteRecentSearchQuery {
  params: IDeleteRecentSearchParams;
  result: IDeleteRecentSearchResult;
}

const deleteRecentSearchIR: any = {"usedParamSet":{"userExternalId":true,"query":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":104,"b":118}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":137,"b":142}]}],"statement":"DELETE FROM contacts.search_history sh\nUSING auth.users u\nWHERE sh.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND sh.query = :query\nRETURNING sh.id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.search_history sh
 * USING auth.users u
 * WHERE sh.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND sh.query = :query
 * RETURNING sh.id
 * ```
 */
export const deleteRecentSearch = new PreparedQuery<IDeleteRecentSearchParams,IDeleteRecentSearchResult>(deleteRecentSearchIR);


/** 'ClearRecentSearches' parameters type */
export interface IClearRecentSearchesParams {
  userExternalId?: string | null | void;
}

/** 'ClearRecentSearches' return type */
export interface IClearRecentSearchesResult {
  /** Internal sequential ID */
  id: number;
}

/** 'ClearRecentSearches' query type */
export interface IClearRecentSearchesQuery {
  params: IClearRecentSearchesParams;
  result: IClearRecentSearchesResult;
}

const clearRecentSearchesIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":104,"b":118}]}],"statement":"DELETE FROM contacts.search_history sh\nUSING auth.users u\nWHERE sh.user_id = u.id\n  AND u.external_id = :userExternalId\nRETURNING sh.id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.search_history sh
 * USING auth.users u
 * WHERE sh.user_id = u.id
 *   AND u.external_id = :userExternalId
 * RETURNING sh.id
 * ```
 */
export const clearRecentSearches = new PreparedQuery<IClearRecentSearchesParams,IClearRecentSearchesResult>(clearRecentSearchesIR);


/** 'FacetedSearch' parameters type */
export interface IFacetedSearchParams {
  filterCity?: stringArray | null | void;
  filterCountry?: stringArray | null | void;
  filterDepartment?: stringArray | null | void;
  filterJobTitle?: stringArray | null | void;
  filterOrganization?: stringArray | null | void;
  filterRelationshipCategory?: stringArray | null | void;
  offset?: NumberOrString | null | void;
  pageSize?: NumberOrString | null | void;
  query?: string | null | void;
  sortBy?: string | null | void;
  sortOrder?: string | null | void;
  userExternalId?: string | null | void;
  wildcardQuery?: string | null | void;
}

/** 'FacetedSearch' return type */
export interface IFacetedSearchResult {
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  headline: string | null;
  /** Job title / position */
  job_title: string | null;
  match_source: string | null;
  /** Company / organization name */
  organization: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  rank: number | null;
  total_count: number | null;
}

/** 'FacetedSearch' query type */
export interface IFacetedSearchQuery {
  params: IFacetedSearchParams;
  result: IFacetedSearchResult;
}

const facetedSearchIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":381},{"a":685,"b":698},{"a":797,"b":810},{"a":3273,"b":3286}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":555,"b":560},{"a":958,"b":963},{"a":2773,"b":2778},{"a":2880,"b":2885},{"a":3460,"b":3465},{"a":3852,"b":3857}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":838,"b":852}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":1329,"b":1342},{"a":1485,"b":1498}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":1548,"b":1558},{"a":1698,"b":1708}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":1766,"b":1784},{"a":1826,"b":1844}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":1889,"b":1903},{"a":1942,"b":1956}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":2002,"b":2018},{"a":2058,"b":2074}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":2131,"b":2157},{"a":2400,"b":2426}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":4335,"b":4341},{"a":4426,"b":4432},{"a":4515,"b":4521},{"a":4611,"b":4617},{"a":4709,"b":4715},{"a":4803,"b":4809},{"a":4895,"b":4901},{"a":4989,"b":4995}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":4361,"b":4370},{"a":4452,"b":4461},{"a":4544,"b":4553},{"a":4640,"b":4649},{"a":4736,"b":4745},{"a":4830,"b":4839},{"a":4922,"b":4931},{"a":5016,"b":5025}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":5101,"b":5109}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":5122,"b":5128}]}],"statement":"WITH base_matches AS (\n    -- Base query matching contacts via FTS and other search methods\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN contacts.contact_relationships r\n        ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_met_info m\n        ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\nfiltered_matches AS (\n    -- Apply facet filters to base matches\n    SELECT bm.id\n    FROM base_matches bm\n    INNER JOIN contacts.contacts c ON c.id = bm.id\n    WHERE\n        -- Country filter (NULL array means no filter)\n        (:filterCountry::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_addresses a\n            WHERE a.contact_id = c.id AND a.country = ANY(:filterCountry)\n        ))\n        -- City filter\n        AND (:filterCity::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_addresses a\n            WHERE a.contact_id = c.id AND a.city = ANY(:filterCity)\n        ))\n        -- Organization filter\n        AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))\n        -- Job title filter\n        AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))\n        -- Department filter\n        AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))\n        -- Relationship category filter\n        AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_relationships rel\n            INNER JOIN contacts.relationship_types rt ON rel.relationship_type_id = rt.id\n            WHERE rel.contact_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n        ))\n),\nmatching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        c.created_at,\n        c.updated_at,\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            ELSE 'notes'\n        END as match_source\n    FROM filtered_matches fm\n    INNER JOIN contacts.contacts c ON c.id = fm.id\n    -- Re-join for match_source determination\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_contacts\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE(mc.work_notes, ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        (SELECT e.email_address FROM contacts.contact_emails e\n         WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM contacts.contact_phones p\n         WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_contacts mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

/**
 * Query generated from SQL:
 * ```
 * WITH base_matches AS (
 *     -- Base query matching contacts via FTS and other search methods
 *     -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)
 *     SELECT DISTINCT c.id
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     LEFT JOIN contacts.contact_emails e
 *         ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_phones p
 *         ON p.contact_id = c.id
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN contacts.contact_relationships r
 *         ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_met_info m
 *         ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           OR e.id IS NOT NULL
 *           OR p.id IS NOT NULL
 *           OR r.id IS NOT NULL
 *           OR m.id IS NOT NULL
 *       )
 * ),
 * filtered_matches AS (
 *     -- Apply facet filters to base matches
 *     SELECT bm.id
 *     FROM base_matches bm
 *     INNER JOIN contacts.contacts c ON c.id = bm.id
 *     WHERE
 *         -- Country filter (NULL array means no filter)
 *         (:filterCountry::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM contacts.contact_addresses a
 *             WHERE a.contact_id = c.id AND a.country = ANY(:filterCountry)
 *         ))
 *         -- City filter
 *         AND (:filterCity::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM contacts.contact_addresses a
 *             WHERE a.contact_id = c.id AND a.city = ANY(:filterCity)
 *         ))
 *         -- Organization filter
 *         AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))
 *         -- Job title filter
 *         AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))
 *         -- Department filter
 *         AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))
 *         -- Relationship category filter
 *         AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM contacts.contact_relationships rel
 *             INNER JOIN contacts.relationship_types rt ON rel.relationship_type_id = rt.id
 *             WHERE rel.contact_id = c.id AND rt.category = ANY(:filterRelationshipCategory)
 *         ))
 * ),
 * matching_contacts AS (
 *     SELECT DISTINCT ON (c.id)
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         c.organization,
 *         c.job_title,
 *         c.work_notes,
 *         c.created_at,
 *         c.updated_at,
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'
 *             WHEN e.id IS NOT NULL THEN 'email'
 *             WHEN p.id IS NOT NULL THEN 'phone'
 *             ELSE 'notes'
 *         END as match_source
 *     FROM filtered_matches fm
 *     INNER JOIN contacts.contacts c ON c.id = fm.id
 *     -- Re-join for match_source determination
 *     LEFT JOIN contacts.contact_emails e
 *         ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_phones p
 *         ON p.contact_id = c.id
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 * ),
 * total_count AS (
 *     SELECT COUNT(*)::int as count FROM matching_contacts
 * ),
 * sorted_results AS (
 *     SELECT
 *         mc.*,
 *         ts_headline(
 *             'english',
 *             COALESCE(mc.display_name, '') || ' ' ||
 *             COALESCE(mc.organization, '') || ' ' ||
 *             COALESCE(mc.work_notes, ''),
 *             websearch_to_tsquery('english', :query),
 *             'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
 *         ) as headline,
 *         (SELECT e.email_address FROM contacts.contact_emails e
 *          WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
 *         (SELECT p.phone_number FROM contacts.contact_phones p
 *          WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
 *     FROM matching_contacts mc
 *     ORDER BY
 *         CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,
 *         CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,
 *         CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,
 *         CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,
 *         CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,
 *         CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,
 *         CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,
 *         CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,
 *         mc.display_name ASC
 *     LIMIT :pageSize
 *     OFFSET :offset
 * )
 * SELECT
 *     sr.external_id,
 *     sr.display_name,
 *     sr.photo_thumbnail_url,
 *     sr.organization,
 *     sr.job_title,
 *     sr.fts_rank as rank,
 *     sr.match_source,
 *     sr.headline,
 *     sr.primary_email,
 *     sr.primary_phone,
 *     tc.count as total_count
 * FROM sorted_results sr
 * CROSS JOIN total_count tc
 * ```
 */
export const facetedSearch = new PreparedQuery<IFacetedSearchParams,IFacetedSearchResult>(facetedSearchIR);


/** 'GetFacetCounts' parameters type */
export interface IGetFacetCountsParams {
  query?: string | null | void;
  userExternalId?: string | null | void;
  wildcardQuery?: string | null | void;
}

/** 'GetFacetCounts' return type */
export interface IGetFacetCountsResult {
  count: number | null;
  facet_field: string | null;
  facet_value: string | null;
}

/** 'GetFacetCounts' query type */
export interface IGetFacetCountsQuery {
  params: IGetFacetCountsParams;
  result: IGetFacetCountsResult;
}

const getFacetCountsIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":367,"b":380},{"a":684,"b":697},{"a":796,"b":809}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":554,"b":559},{"a":957,"b":962}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":837,"b":851}]}],"statement":"WITH base_matches AS (\n    -- Base query matching contacts via FTS (same as FacetedSearch)\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN contacts.contact_relationships r\n        ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_met_info m\n        ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_addresses a ON a.contact_id = bm.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_addresses a ON a.contact_id = bm.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet\nSELECT\n    'organization' as facet_field,\n    c.organization as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.organization IS NOT NULL\nGROUP BY c.organization\n\nUNION ALL\n\n-- Job title facet\nSELECT\n    'job_title' as facet_field,\n    c.job_title as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.job_title IS NOT NULL\nGROUP BY c.job_title\n\nUNION ALL\n\n-- Department facet\nSELECT\n    'department' as facet_field,\n    c.department as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.department IS NOT NULL\nGROUP BY c.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_relationships r ON r.contact_id = bm.id\nINNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

/**
 * Query generated from SQL:
 * ```
 * WITH base_matches AS (
 *     -- Base query matching contacts via FTS (same as FacetedSearch)
 *     -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)
 *     SELECT DISTINCT c.id
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     LEFT JOIN contacts.contact_emails e
 *         ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_phones p
 *         ON p.contact_id = c.id
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN contacts.contact_relationships r
 *         ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN contacts.contact_met_info m
 *         ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           OR e.id IS NOT NULL
 *           OR p.id IS NOT NULL
 *           OR r.id IS NOT NULL
 *           OR m.id IS NOT NULL
 *       )
 * )
 * -- Country facet
 * SELECT
 *     'country' as facet_field,
 *     a.country as facet_value,
 *     COUNT(DISTINCT bm.id)::int as count
 * FROM base_matches bm
 * INNER JOIN contacts.contact_addresses a ON a.contact_id = bm.id
 * WHERE a.country IS NOT NULL
 * GROUP BY a.country
 * 
 * UNION ALL
 * 
 * -- City facet
 * SELECT
 *     'city' as facet_field,
 *     a.city as facet_value,
 *     COUNT(DISTINCT bm.id)::int as count
 * FROM base_matches bm
 * INNER JOIN contacts.contact_addresses a ON a.contact_id = bm.id
 * WHERE a.city IS NOT NULL
 * GROUP BY a.city
 * 
 * UNION ALL
 * 
 * -- Organization facet
 * SELECT
 *     'organization' as facet_field,
 *     c.organization as facet_value,
 *     COUNT(*)::int as count
 * FROM base_matches bm
 * INNER JOIN contacts.contacts c ON c.id = bm.id
 * WHERE c.organization IS NOT NULL
 * GROUP BY c.organization
 * 
 * UNION ALL
 * 
 * -- Job title facet
 * SELECT
 *     'job_title' as facet_field,
 *     c.job_title as facet_value,
 *     COUNT(*)::int as count
 * FROM base_matches bm
 * INNER JOIN contacts.contacts c ON c.id = bm.id
 * WHERE c.job_title IS NOT NULL
 * GROUP BY c.job_title
 * 
 * UNION ALL
 * 
 * -- Department facet
 * SELECT
 *     'department' as facet_field,
 *     c.department as facet_value,
 *     COUNT(*)::int as count
 * FROM base_matches bm
 * INNER JOIN contacts.contacts c ON c.id = bm.id
 * WHERE c.department IS NOT NULL
 * GROUP BY c.department
 * 
 * UNION ALL
 * 
 * -- Relationship category facet
 * SELECT
 *     'relationship_category' as facet_field,
 *     rt.category as facet_value,
 *     COUNT(DISTINCT bm.id)::int as count
 * FROM base_matches bm
 * INNER JOIN contacts.contact_relationships r ON r.contact_id = bm.id
 * INNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id
 * GROUP BY rt.category
 * 
 * ORDER BY facet_field, count DESC, facet_value
 * ```
 */
export const getFacetCounts = new PreparedQuery<IGetFacetCountsParams,IGetFacetCountsResult>(getFacetCountsIR);


/** 'FilterOnlyList' parameters type */
export interface IFilterOnlyListParams {
  filterCity?: stringArray | null | void;
  filterCountry?: stringArray | null | void;
  filterDepartment?: stringArray | null | void;
  filterJobTitle?: stringArray | null | void;
  filterOrganization?: stringArray | null | void;
  filterRelationshipCategory?: stringArray | null | void;
  offset?: NumberOrString | null | void;
  pageSize?: NumberOrString | null | void;
  sortBy?: string | null | void;
  sortOrder?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'FilterOnlyList' return type */
export interface IFilterOnlyListResult {
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Job title / position */
  job_title: string | null;
  /** Company / organization name */
  organization: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  total_count: number | null;
}

/** 'FilterOnlyList' query type */
export interface IFilterOnlyListQuery {
  params: IFilterOnlyListParams;
  result: IFilterOnlyListResult;
}

const filterOnlyListIR: any = {"usedParamSet":{"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":205,"b":219}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":316,"b":329},{"a":468,"b":481}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":525,"b":535},{"a":671,"b":681}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":733,"b":751},{"a":793,"b":811}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":852,"b":866},{"a":905,"b":919}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":961,"b":977},{"a":1017,"b":1033}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":1086,"b":1112},{"a":1349,"b":1375}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":2043,"b":2049},{"a":2138,"b":2144},{"a":2235,"b":2241},{"a":2328,"b":2334},{"a":2419,"b":2425},{"a":2512,"b":2518}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":2072,"b":2081},{"a":2167,"b":2176},{"a":2262,"b":2271},{"a":2355,"b":2364},{"a":2446,"b":2455},{"a":2539,"b":2548}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":2622,"b":2630}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":2643,"b":2649}]}],"statement":"-- Lists contacts with filter support but no search query\nWITH filtered_contacts AS (\n    SELECT c.id\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      -- Country filter (NULL array means no filter)\n      AND (:filterCountry::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM contacts.contact_addresses a\n          WHERE a.contact_id = c.id AND a.country = ANY(:filterCountry)\n      ))\n      -- City filter\n      AND (:filterCity::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM contacts.contact_addresses a\n          WHERE a.contact_id = c.id AND a.city = ANY(:filterCity)\n      ))\n      -- Organization filter\n      AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))\n      -- Job title filter\n      AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))\n      -- Department filter\n      AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))\n      -- Relationship category filter\n      AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM contacts.contact_relationships rel\n          INNER JOIN contacts.relationship_types rt ON rel.relationship_type_id = rt.id\n          WHERE rel.contact_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n      ))\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM filtered_contacts\n),\nsorted_results AS (\n    SELECT\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        (SELECT e.email_address FROM contacts.contact_emails e\n         WHERE e.contact_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM contacts.contact_phones p\n         WHERE p.contact_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM filtered_contacts fc\n    INNER JOIN contacts.contacts c ON c.id = fc.id\n    ORDER BY\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,\n        c.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

/**
 * Query generated from SQL:
 * ```
 * -- Lists contacts with filter support but no search query
 * WITH filtered_contacts AS (
 *     SELECT c.id
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       -- Country filter (NULL array means no filter)
 *       AND (:filterCountry::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM contacts.contact_addresses a
 *           WHERE a.contact_id = c.id AND a.country = ANY(:filterCountry)
 *       ))
 *       -- City filter
 *       AND (:filterCity::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM contacts.contact_addresses a
 *           WHERE a.contact_id = c.id AND a.city = ANY(:filterCity)
 *       ))
 *       -- Organization filter
 *       AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))
 *       -- Job title filter
 *       AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))
 *       -- Department filter
 *       AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))
 *       -- Relationship category filter
 *       AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM contacts.contact_relationships rel
 *           INNER JOIN contacts.relationship_types rt ON rel.relationship_type_id = rt.id
 *           WHERE rel.contact_id = c.id AND rt.category = ANY(:filterRelationshipCategory)
 *       ))
 * ),
 * total_count AS (
 *     SELECT COUNT(*)::int as count FROM filtered_contacts
 * ),
 * sorted_results AS (
 *     SELECT
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         c.organization,
 *         c.job_title,
 *         (SELECT e.email_address FROM contacts.contact_emails e
 *          WHERE e.contact_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,
 *         (SELECT p.phone_number FROM contacts.contact_phones p
 *          WHERE p.contact_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone
 *     FROM filtered_contacts fc
 *     INNER JOIN contacts.contacts c ON c.id = fc.id
 *     ORDER BY
 *         CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,
 *         CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,
 *         CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,
 *         CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,
 *         CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC,
 *         CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,
 *         c.display_name ASC
 *     LIMIT :pageSize
 *     OFFSET :offset
 * )
 * SELECT
 *     sr.external_id,
 *     sr.display_name,
 *     sr.photo_thumbnail_url,
 *     sr.organization,
 *     sr.job_title,
 *     sr.primary_email,
 *     sr.primary_phone,
 *     tc.count as total_count
 * FROM sorted_results sr
 * CROSS JOIN total_count tc
 * ```
 */
export const filterOnlyList = new PreparedQuery<IFilterOnlyListParams,IFilterOnlyListResult>(filterOnlyListIR);


/** 'GetAllFacetCounts' parameters type */
export interface IGetAllFacetCountsParams {
  userExternalId?: string | null | void;
}

/** 'GetAllFacetCounts' return type */
export interface IGetAllFacetCountsResult {
  count: number | null;
  facet_field: string | null;
  facet_value: string | null;
}

/** 'GetAllFacetCounts' query type */
export interface IGetAllFacetCountsQuery {
  params: IGetAllFacetCountsParams;
  result: IGetAllFacetCountsResult;
}

const getAllFacetCountsIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":199,"b":213}]}],"statement":"-- Gets facet counts for all contacts (no search filter)\nWITH all_contacts AS (\n    SELECT c.id\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_contacts ac\nINNER JOIN contacts.contact_addresses a ON a.contact_id = ac.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_contacts ac\nINNER JOIN contacts.contact_addresses a ON a.contact_id = ac.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet\nSELECT\n    'organization' as facet_field,\n    c.organization as facet_value,\n    COUNT(*)::int as count\nFROM all_contacts ac\nINNER JOIN contacts.contacts c ON c.id = ac.id\nWHERE c.organization IS NOT NULL\nGROUP BY c.organization\n\nUNION ALL\n\n-- Job title facet\nSELECT\n    'job_title' as facet_field,\n    c.job_title as facet_value,\n    COUNT(*)::int as count\nFROM all_contacts ac\nINNER JOIN contacts.contacts c ON c.id = ac.id\nWHERE c.job_title IS NOT NULL\nGROUP BY c.job_title\n\nUNION ALL\n\n-- Department facet\nSELECT\n    'department' as facet_field,\n    c.department as facet_value,\n    COUNT(*)::int as count\nFROM all_contacts ac\nINNER JOIN contacts.contacts c ON c.id = ac.id\nWHERE c.department IS NOT NULL\nGROUP BY c.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_contacts ac\nINNER JOIN contacts.contact_relationships r ON r.contact_id = ac.id\nINNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets facet counts for all contacts (no search filter)
 * WITH all_contacts AS (
 *     SELECT c.id
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 * )
 * -- Country facet
 * SELECT
 *     'country' as facet_field,
 *     a.country as facet_value,
 *     COUNT(DISTINCT ac.id)::int as count
 * FROM all_contacts ac
 * INNER JOIN contacts.contact_addresses a ON a.contact_id = ac.id
 * WHERE a.country IS NOT NULL
 * GROUP BY a.country
 * 
 * UNION ALL
 * 
 * -- City facet
 * SELECT
 *     'city' as facet_field,
 *     a.city as facet_value,
 *     COUNT(DISTINCT ac.id)::int as count
 * FROM all_contacts ac
 * INNER JOIN contacts.contact_addresses a ON a.contact_id = ac.id
 * WHERE a.city IS NOT NULL
 * GROUP BY a.city
 * 
 * UNION ALL
 * 
 * -- Organization facet
 * SELECT
 *     'organization' as facet_field,
 *     c.organization as facet_value,
 *     COUNT(*)::int as count
 * FROM all_contacts ac
 * INNER JOIN contacts.contacts c ON c.id = ac.id
 * WHERE c.organization IS NOT NULL
 * GROUP BY c.organization
 * 
 * UNION ALL
 * 
 * -- Job title facet
 * SELECT
 *     'job_title' as facet_field,
 *     c.job_title as facet_value,
 *     COUNT(*)::int as count
 * FROM all_contacts ac
 * INNER JOIN contacts.contacts c ON c.id = ac.id
 * WHERE c.job_title IS NOT NULL
 * GROUP BY c.job_title
 * 
 * UNION ALL
 * 
 * -- Department facet
 * SELECT
 *     'department' as facet_field,
 *     c.department as facet_value,
 *     COUNT(*)::int as count
 * FROM all_contacts ac
 * INNER JOIN contacts.contacts c ON c.id = ac.id
 * WHERE c.department IS NOT NULL
 * GROUP BY c.department
 * 
 * UNION ALL
 * 
 * -- Relationship category facet
 * SELECT
 *     'relationship_category' as facet_field,
 *     rt.category as facet_value,
 *     COUNT(DISTINCT ac.id)::int as count
 * FROM all_contacts ac
 * INNER JOIN contacts.contact_relationships r ON r.contact_id = ac.id
 * INNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id
 * GROUP BY rt.category
 * 
 * ORDER BY facet_field, count DESC, facet_value
 * ```
 */
export const getAllFacetCounts = new PreparedQuery<IGetAllFacetCountsParams,IGetAllFacetCountsResult>(getAllFacetCountsIR);


