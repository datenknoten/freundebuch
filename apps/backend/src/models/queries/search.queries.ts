/** Types generated for queries found in "src/models/queries/search.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'FullTextSearchFriends' parameters type */
export interface IFullTextSearchFriendsParams {
  limit?: NumberOrString | null | void;
  query?: string | null | void;
  userExternalId?: string | null | void;
  wildcardQuery?: string | null | void;
}

/** 'FullTextSearchFriends' return type */
export interface IFullTextSearchFriendsResult {
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  headline: string | null;
  job_title: string | null;
  match_source: string | null;
  organization: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  rank: number | null;
}

/** 'FullTextSearchFriends' query type */
export interface IFullTextSearchFriendsQuery {
  params: IFullTextSearchFriendsParams;
  result: IFullTextSearchFriendsResult;
}

const fullTextSearchFriendsIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"limit":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":766,"b":771},{"a":943,"b":948},{"a":1527,"b":1532},{"a":1649,"b":1654},{"a":2092,"b":2097},{"a":3253,"b":3258}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1417,"b":1430},{"a":1776,"b":1789},{"a":1885,"b":1898},{"a":2230,"b":2243}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1926,"b":1940}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":2806,"b":2811}]}],"statement":"WITH matching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        -- Get primary professional info\n        (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,\n        (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,\n        (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('german', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('german', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on friend fields\n          c.search_vector @@ websearch_to_tsquery('german', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n    -- Deterministic winner per friend: without this ORDER BY the DISTINCT ON\n    -- row (and therefore match_source) is arbitrary between identical requests.\n    ORDER BY c.id, match_source\n),\npage AS (\n    -- Apply the row limit before the per-row headline work in the final SELECT\n    SELECT mc.*\n    FROM matching_friends mc\n    ORDER BY mc.fts_rank DESC, mc.display_name ASC\n    LIMIT :limit\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    -- Generate headline/snippet for matched content (page rows only)\n    ts_headline(\n        'german',\n        COALESCE(sr.display_name, '') || ' ' ||\n        COALESCE(sr.organization, '') || ' ' ||\n        COALESCE(sr.work_notes, ''),\n        websearch_to_tsquery('german', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    -- Get primary email\n    (SELECT e.email_address FROM friends.friend_emails e\n     WHERE e.friend_id = sr.id AND e.is_primary = true LIMIT 1) as primary_email,\n    -- Get primary phone\n    (SELECT p.phone_number FROM friends.friend_phones p\n     WHERE p.friend_id = sr.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM page sr\nORDER BY sr.fts_rank DESC, sr.display_name ASC"};

/**
 * Query generated from SQL:
 * ```
 * WITH matching_friends AS (
 *     SELECT DISTINCT ON (c.id)
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         -- Get primary professional info
 *         (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,
 *         (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,
 *         (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,
 *         -- Calculate relevance score from full-text search
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('german', :query)), 0) as fts_rank,
 *         -- Determine match source (using joined tables for efficiency)
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('german', :query) THEN 'friend'
 *             WHEN e.id IS NOT NULL THEN 'email'
 *             WHEN p.id IS NOT NULL THEN 'phone'
 *             WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'
 *             ELSE NULL
 *         END as match_source
 *     FROM friends.friends c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     -- LEFT JOINs for efficient matching (avoids correlated subqueries)
 *     LEFT JOIN friends.friend_emails e
 *         ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_phones p
 *         ON p.friend_id = c.id
 *         AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits
 *         AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN friends.friend_relationships r
 *         ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_met_info m
 *         ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           -- Full-text search on friend fields
 *           c.search_vector @@ websearch_to_tsquery('german', :query)
 *           -- Partial/prefix matching on display_name (for queries like "Kür" matching "Kürzer")
 *           OR c.display_name ILIKE :wildcardQuery
 *           -- OR matches from joined tables
 *           OR e.id IS NOT NULL
 *           OR p.id IS NOT NULL
 *           OR r.id IS NOT NULL
 *           OR m.id IS NOT NULL
 *       )
 *     -- Deterministic winner per friend: without this ORDER BY the DISTINCT ON
 *     -- row (and therefore match_source) is arbitrary between identical requests.
 *     ORDER BY c.id, match_source
 * ),
 * page AS (
 *     -- Apply the row limit before the per-row headline work in the final SELECT
 *     SELECT mc.*
 *     FROM matching_friends mc
 *     ORDER BY mc.fts_rank DESC, mc.display_name ASC
 *     LIMIT :limit
 * )
 * SELECT
 *     sr.external_id,
 *     sr.display_name,
 *     sr.photo_thumbnail_url,
 *     sr.organization,
 *     sr.job_title,
 *     sr.fts_rank as rank,
 *     sr.match_source,
 *     -- Generate headline/snippet for matched content (page rows only)
 *     ts_headline(
 *         'german',
 *         COALESCE(sr.display_name, '') || ' ' ||
 *         COALESCE(sr.organization, '') || ' ' ||
 *         COALESCE(sr.work_notes, ''),
 *         websearch_to_tsquery('german', :query),
 *         'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
 *     ) as headline,
 *     -- Get primary email
 *     (SELECT e.email_address FROM friends.friend_emails e
 *      WHERE e.friend_id = sr.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     -- Get primary phone
 *     (SELECT p.phone_number FROM friends.friend_phones p
 *      WHERE p.friend_id = sr.id AND p.is_primary = true LIMIT 1) as primary_phone
 * FROM page sr
 * ORDER BY sr.fts_rank DESC, sr.display_name ASC
 * ```
 */
export const fullTextSearchFriends = new PreparedQuery<IFullTextSearchFriendsParams,IFullTextSearchFriendsResult>(fullTextSearchFriendsIR);


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
  job_title: string | null;
  match_source: string | null;
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

const paginatedFullTextSearchIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":810,"b":815},{"a":987,"b":992},{"a":1571,"b":1576},{"a":1693,"b":1698},{"a":2136,"b":2141},{"a":4219,"b":4224}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1461,"b":1474},{"a":1820,"b":1833},{"a":1929,"b":1942},{"a":2274,"b":2287}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1970,"b":1984}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":2837,"b":2843},{"a":2936,"b":2942},{"a":3033,"b":3039},{"a":3137,"b":3143},{"a":3243,"b":3249},{"a":3345,"b":3351},{"a":3445,"b":3451},{"a":3547,"b":3553}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":2863,"b":2872},{"a":2962,"b":2971},{"a":3062,"b":3071},{"a":3166,"b":3175},{"a":3270,"b":3279},{"a":3372,"b":3381},{"a":3472,"b":3481},{"a":3574,"b":3583}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":3750,"b":3758}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3771,"b":3777}]}],"statement":"WITH matching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        -- Get primary professional info\n        (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,\n        (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,\n        (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,\n        c.created_at,\n        c.updated_at,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('german', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('german', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on friend fields\n          c.search_vector @@ websearch_to_tsquery('german', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n    -- Deterministic winner per friend (see FullTextSearchFriends)\n    ORDER BY c.id, match_source\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_friends\n),\nsorted_results AS (\n    -- Only ids, rank and sort keys here; the headline runs after LIMIT/OFFSET\n    SELECT\n        mc.*,\n        row_number() OVER (\n            ORDER BY\n                CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n                CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n                CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n                CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n                CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n                CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n                CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n                CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n                mc.display_name ASC\n        ) as sort_position\n    FROM matching_friends mc\n    ORDER BY sort_position\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    -- Generate headline/snippet for matched content (page rows only)\n    ts_headline(\n        'german',\n        COALESCE(sr.display_name, '') || ' ' ||\n        COALESCE(sr.organization, '') || ' ' ||\n        COALESCE(sr.work_notes, ''),\n        websearch_to_tsquery('german', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    -- Get primary email\n    (SELECT e.email_address FROM friends.friend_emails e\n     WHERE e.friend_id = sr.id AND e.is_primary = true LIMIT 1) as primary_email,\n    -- Get primary phone\n    (SELECT p.phone_number FROM friends.friend_phones p\n     WHERE p.friend_id = sr.id AND p.is_primary = true LIMIT 1) as primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc\nORDER BY sr.sort_position"};

/**
 * Query generated from SQL:
 * ```
 * WITH matching_friends AS (
 *     SELECT DISTINCT ON (c.id)
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         -- Get primary professional info
 *         (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,
 *         (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,
 *         (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,
 *         c.created_at,
 *         c.updated_at,
 *         -- Calculate relevance score from full-text search
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('german', :query)), 0) as fts_rank,
 *         -- Determine match source (using joined tables for efficiency)
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('german', :query) THEN 'friend'
 *             WHEN e.id IS NOT NULL THEN 'email'
 *             WHEN p.id IS NOT NULL THEN 'phone'
 *             WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'
 *             ELSE NULL
 *         END as match_source
 *     FROM friends.friends c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     -- LEFT JOINs for efficient matching (avoids correlated subqueries)
 *     LEFT JOIN friends.friend_emails e
 *         ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_phones p
 *         ON p.friend_id = c.id
 *         AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits
 *         AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN friends.friend_relationships r
 *         ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_met_info m
 *         ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           -- Full-text search on friend fields
 *           c.search_vector @@ websearch_to_tsquery('german', :query)
 *           -- Partial/prefix matching on display_name (for queries like "Kür" matching "Kürzer")
 *           OR c.display_name ILIKE :wildcardQuery
 *           -- OR matches from joined tables
 *           OR e.id IS NOT NULL
 *           OR p.id IS NOT NULL
 *           OR r.id IS NOT NULL
 *           OR m.id IS NOT NULL
 *       )
 *     -- Deterministic winner per friend (see FullTextSearchFriends)
 *     ORDER BY c.id, match_source
 * ),
 * total_count AS (
 *     SELECT COUNT(*)::int as count FROM matching_friends
 * ),
 * sorted_results AS (
 *     -- Only ids, rank and sort keys here; the headline runs after LIMIT/OFFSET
 *     SELECT
 *         mc.*,
 *         row_number() OVER (
 *             ORDER BY
 *                 CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,
 *                 CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,
 *                 CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,
 *                 CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,
 *                 CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,
 *                 CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,
 *                 CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,
 *                 CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,
 *                 mc.display_name ASC
 *         ) as sort_position
 *     FROM matching_friends mc
 *     ORDER BY sort_position
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
 *     -- Generate headline/snippet for matched content (page rows only)
 *     ts_headline(
 *         'german',
 *         COALESCE(sr.display_name, '') || ' ' ||
 *         COALESCE(sr.organization, '') || ' ' ||
 *         COALESCE(sr.work_notes, ''),
 *         websearch_to_tsquery('german', :query),
 *         'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
 *     ) as headline,
 *     -- Get primary email
 *     (SELECT e.email_address FROM friends.friend_emails e
 *      WHERE e.friend_id = sr.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     -- Get primary phone
 *     (SELECT p.phone_number FROM friends.friend_phones p
 *      WHERE p.friend_id = sr.id AND p.is_primary = true LIMIT 1) as primary_phone,
 *     tc.count as total_count
 * FROM sorted_results sr
 * CROSS JOIN total_count tc
 * ORDER BY sr.sort_position
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

const getRecentSearchesIR: any = {"usedParamSet":{"userExternalId":true,"limit":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":130,"b":144}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":181,"b":186}]}],"statement":"SELECT sh.query, sh.searched_at\nFROM friends.search_history sh\nINNER JOIN auth.users u ON sh.user_id = u.id\nWHERE u.external_id = :userExternalId\nORDER BY sh.searched_at DESC\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * SELECT sh.query, sh.searched_at
 * FROM friends.search_history sh
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

const addRecentSearchIR: any = {"usedParamSet":{"query":true,"userExternalId":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":78,"b":83}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":158}]}],"statement":"INSERT INTO friends.search_history (user_id, query, searched_at)\nSELECT u.id, :query, CURRENT_TIMESTAMP\nFROM auth.users u\nWHERE u.external_id = :userExternalId\nON CONFLICT (user_id, query)\nDO UPDATE SET searched_at = CURRENT_TIMESTAMP\nRETURNING id, query, searched_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.search_history (user_id, query, searched_at)
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

const deleteRecentSearchIR: any = {"usedParamSet":{"userExternalId":true,"query":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":117}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":136,"b":141}]}],"statement":"DELETE FROM friends.search_history sh\nUSING auth.users u\nWHERE sh.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND sh.query = :query\nRETURNING sh.id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.search_history sh
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

const clearRecentSearchesIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":117}]}],"statement":"DELETE FROM friends.search_history sh\nUSING auth.users u\nWHERE sh.user_id = u.id\n  AND u.external_id = :userExternalId\nRETURNING sh.id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.search_history sh
 * USING auth.users u
 * WHERE sh.user_id = u.id
 *   AND u.external_id = :userExternalId
 * RETURNING sh.id
 * ```
 */
export const clearRecentSearches = new PreparedQuery<IClearRecentSearchesParams,IClearRecentSearchesResult>(clearRecentSearchesIR);


/** 'FacetedSearch' parameters type */
export interface IFacetedSearchParams {
  filterCircles?: stringArray | null | void;
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
  circles: Json | null;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  headline: string | null;
  job_title: string | null;
  match_source: string | null;
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

const facetedSearchIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"filterCircles":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":362,"b":375},{"a":721,"b":734},{"a":830,"b":843},{"a":1128,"b":1141},{"a":5080,"b":5093}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":472,"b":477},{"a":594,"b":599},{"a":990,"b":995},{"a":4587,"b":4592},{"a":4693,"b":4698},{"a":5190,"b":5195},{"a":5312,"b":5317},{"a":7038,"b":7043}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":871,"b":885}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":1504,"b":1517},{"a":1657,"b":1670}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":1720,"b":1730},{"a":1867,"b":1877}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":1963,"b":1981},{"a":2140,"b":2158}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":2241,"b":2255},{"a":2411,"b":2425}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":2509,"b":2525},{"a":2682,"b":2698}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":2765,"b":2791},{"a":3030,"b":3056}]},{"name":"filterCircles","required":false,"transform":{"type":"scalar"},"locs":[{"a":3174,"b":3187},{"a":3285,"b":3298},{"a":3767,"b":3780}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":5726,"b":5732},{"a":5825,"b":5831},{"a":5922,"b":5928},{"a":6026,"b":6032},{"a":6132,"b":6138},{"a":6234,"b":6240},{"a":6334,"b":6340},{"a":6436,"b":6442}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":5752,"b":5761},{"a":5851,"b":5860},{"a":5951,"b":5960},{"a":6055,"b":6064},{"a":6159,"b":6168},{"a":6261,"b":6270},{"a":6361,"b":6370},{"a":6463,"b":6472}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":6639,"b":6647}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":6660,"b":6666}]}],"statement":"WITH base_matches AS (\n    -- Base query matching friends via FTS and other search methods\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('german', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\nfiltered_matches AS (\n    -- Apply facet filters to base matches\n    SELECT bm.id\n    FROM base_matches bm\n    INNER JOIN friends.friends c ON c.id = bm.id\n    WHERE\n        -- Country filter (NULL array means no filter)\n        (:filterCountry::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_addresses a\n            WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)\n        ))\n        -- City filter\n        AND (:filterCity::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_addresses a\n            WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)\n        ))\n        -- Organization filter (from professional history)\n        AND (:filterOrganization::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_professional_history ph\n            WHERE ph.friend_id = c.id AND ph.organization = ANY(:filterOrganization)\n        ))\n        -- Job title filter (from professional history)\n        AND (:filterJobTitle::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_professional_history ph\n            WHERE ph.friend_id = c.id AND ph.job_title = ANY(:filterJobTitle)\n        ))\n        -- Department filter (from professional history)\n        AND (:filterDepartment::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_professional_history ph\n            WHERE ph.friend_id = c.id AND ph.department = ANY(:filterDepartment)\n        ))\n        -- Relationship category filter\n        AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_relationships rel\n            INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id\n            WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n        ))\n        -- Circles filter: supports circle IDs and 'no-circle' for friends without circles\n        AND (:filterCircles::text[] IS NULL OR (\n            -- Check for 'no-circle' filter\n            ('no-circle' = ANY(:filterCircles::text[]) AND NOT EXISTS (\n                SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id\n            ))\n            OR\n            -- Check for specific circle IDs (filter out 'no-circle' from array)\n            EXISTS (\n                SELECT 1 FROM friends.friend_circles fc\n                INNER JOIN friends.circles cir ON fc.circle_id = cir.id\n                WHERE fc.friend_id = c.id\n                  AND cir.external_id = ANY(array_remove(:filterCircles::text[], 'no-circle')::uuid[])\n            )\n        ))\n),\nmatching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        -- Get primary professional info\n        (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,\n        (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,\n        (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,\n        c.created_at,\n        c.updated_at,\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('german', :query)), 0) as fts_rank,\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('german', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            ELSE 'notes'\n        END as match_source\n    FROM filtered_matches fm\n    INNER JOIN friends.friends c ON c.id = fm.id\n    -- Re-join for match_source determination\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    -- Deterministic winner per friend (see FullTextSearchFriends)\n    ORDER BY c.id, match_source\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_friends\n),\nsorted_results AS (\n    -- Only ids, rank and sort keys here; headline/circles run after LIMIT/OFFSET\n    SELECT\n        mc.*,\n        row_number() OVER (\n            ORDER BY\n                CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n                CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n                CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n                CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n                CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n                CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n                CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n                CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n                mc.display_name ASC\n        ) as sort_position\n    FROM matching_friends mc\n    ORDER BY sort_position\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    ts_headline(\n        'german',\n        COALESCE(sr.display_name, '') || ' ' ||\n        COALESCE(sr.organization, '') || ' ' ||\n        COALESCE(sr.work_notes, ''),\n        websearch_to_tsquery('german', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    (SELECT e.email_address FROM friends.friend_emails e\n     WHERE e.friend_id = sr.id AND e.is_primary = true LIMIT 1) as primary_email,\n    (SELECT p.phone_number FROM friends.friend_phones p\n     WHERE p.friend_id = sr.id AND p.is_primary = true LIMIT 1) as primary_phone,\n    -- Get circles for this friend\n    (SELECT COALESCE(json_agg(json_build_object(\n        'external_id', ci.external_id,\n        'name', ci.name,\n        'color', ci.color\n    ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)\n     FROM friends.circles ci\n     INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id\n     WHERE fci.friend_id = sr.id\n    ) as circles,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc\nORDER BY sr.sort_position"};

/**
 * Query generated from SQL:
 * ```
 * WITH base_matches AS (
 *     -- Base query matching friends via FTS and other search methods
 *     -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)
 *     SELECT DISTINCT c.id
 *     FROM friends.friends c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     LEFT JOIN friends.friend_emails e
 *         ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_phones p
 *         ON p.friend_id = c.id
 *         AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits
 *         AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN friends.friend_relationships r
 *         ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_met_info m
 *         ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('german', :query)
 *           -- Partial/prefix matching on display_name (for queries like "Kür" matching "Kürzer")
 *           OR c.display_name ILIKE :wildcardQuery
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
 *     INNER JOIN friends.friends c ON c.id = bm.id
 *     WHERE
 *         -- Country filter (NULL array means no filter)
 *         (:filterCountry::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM friends.friend_addresses a
 *             WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)
 *         ))
 *         -- City filter
 *         AND (:filterCity::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM friends.friend_addresses a
 *             WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)
 *         ))
 *         -- Organization filter (from professional history)
 *         AND (:filterOrganization::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM friends.friend_professional_history ph
 *             WHERE ph.friend_id = c.id AND ph.organization = ANY(:filterOrganization)
 *         ))
 *         -- Job title filter (from professional history)
 *         AND (:filterJobTitle::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM friends.friend_professional_history ph
 *             WHERE ph.friend_id = c.id AND ph.job_title = ANY(:filterJobTitle)
 *         ))
 *         -- Department filter (from professional history)
 *         AND (:filterDepartment::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM friends.friend_professional_history ph
 *             WHERE ph.friend_id = c.id AND ph.department = ANY(:filterDepartment)
 *         ))
 *         -- Relationship category filter
 *         AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (
 *             SELECT 1 FROM friends.friend_relationships rel
 *             INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id
 *             WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)
 *         ))
 *         -- Circles filter: supports circle IDs and 'no-circle' for friends without circles
 *         AND (:filterCircles::text[] IS NULL OR (
 *             -- Check for 'no-circle' filter
 *             ('no-circle' = ANY(:filterCircles::text[]) AND NOT EXISTS (
 *                 SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id
 *             ))
 *             OR
 *             -- Check for specific circle IDs (filter out 'no-circle' from array)
 *             EXISTS (
 *                 SELECT 1 FROM friends.friend_circles fc
 *                 INNER JOIN friends.circles cir ON fc.circle_id = cir.id
 *                 WHERE fc.friend_id = c.id
 *                   AND cir.external_id = ANY(array_remove(:filterCircles::text[], 'no-circle')::uuid[])
 *             )
 *         ))
 * ),
 * matching_friends AS (
 *     SELECT DISTINCT ON (c.id)
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         -- Get primary professional info
 *         (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,
 *         (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,
 *         (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,
 *         c.created_at,
 *         c.updated_at,
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('german', :query)), 0) as fts_rank,
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('german', :query) THEN 'friend'
 *             WHEN e.id IS NOT NULL THEN 'email'
 *             WHEN p.id IS NOT NULL THEN 'phone'
 *             ELSE 'notes'
 *         END as match_source
 *     FROM filtered_matches fm
 *     INNER JOIN friends.friends c ON c.id = fm.id
 *     -- Re-join for match_source determination
 *     LEFT JOIN friends.friend_emails e
 *         ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_phones p
 *         ON p.friend_id = c.id
 *         AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits
 *         AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     -- Deterministic winner per friend (see FullTextSearchFriends)
 *     ORDER BY c.id, match_source
 * ),
 * total_count AS (
 *     SELECT COUNT(*)::int as count FROM matching_friends
 * ),
 * sorted_results AS (
 *     -- Only ids, rank and sort keys here; headline/circles run after LIMIT/OFFSET
 *     SELECT
 *         mc.*,
 *         row_number() OVER (
 *             ORDER BY
 *                 CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,
 *                 CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,
 *                 CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,
 *                 CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,
 *                 CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,
 *                 CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,
 *                 CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,
 *                 CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,
 *                 mc.display_name ASC
 *         ) as sort_position
 *     FROM matching_friends mc
 *     ORDER BY sort_position
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
 *     ts_headline(
 *         'german',
 *         COALESCE(sr.display_name, '') || ' ' ||
 *         COALESCE(sr.organization, '') || ' ' ||
 *         COALESCE(sr.work_notes, ''),
 *         websearch_to_tsquery('german', :query),
 *         'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
 *     ) as headline,
 *     (SELECT e.email_address FROM friends.friend_emails e
 *      WHERE e.friend_id = sr.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     (SELECT p.phone_number FROM friends.friend_phones p
 *      WHERE p.friend_id = sr.id AND p.is_primary = true LIMIT 1) as primary_phone,
 *     -- Get circles for this friend
 *     (SELECT COALESCE(json_agg(json_build_object(
 *         'external_id', ci.external_id,
 *         'name', ci.name,
 *         'color', ci.color
 *     ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)
 *      FROM friends.circles ci
 *      INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id
 *      WHERE fci.friend_id = sr.id
 *     ) as circles,
 *     tc.count as total_count
 * FROM sorted_results sr
 * CROSS JOIN total_count tc
 * ORDER BY sr.sort_position
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

const getFacetCountsIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":361,"b":374},{"a":720,"b":733},{"a":829,"b":842},{"a":1127,"b":1140}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":471,"b":476},{"a":593,"b":598},{"a":989,"b":994}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":870,"b":884}]}],"statement":"WITH base_matches AS (\n    -- Base query matching friends via FTS (same as FacetedSearch)\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('german', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_addresses a ON a.friend_id = bm.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_addresses a ON a.friend_id = bm.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet (from professional history)\nSELECT\n    'organization' as facet_field,\n    ph.organization as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id\nWHERE ph.organization IS NOT NULL\nGROUP BY ph.organization\n\nUNION ALL\n\n-- Job title facet (from professional history)\nSELECT\n    'job_title' as facet_field,\n    ph.job_title as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id\nWHERE ph.job_title IS NOT NULL\nGROUP BY ph.job_title\n\nUNION ALL\n\n-- Department facet (from professional history)\nSELECT\n    'department' as facet_field,\n    ph.department as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id\nWHERE ph.department IS NOT NULL\nGROUP BY ph.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_relationships r ON r.friend_id = bm.id\nINNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

/**
 * Query generated from SQL:
 * ```
 * WITH base_matches AS (
 *     -- Base query matching friends via FTS (same as FacetedSearch)
 *     -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)
 *     SELECT DISTINCT c.id
 *     FROM friends.friends c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     LEFT JOIN friends.friend_emails e
 *         ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_phones p
 *         ON p.friend_id = c.id
 *         AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits
 *         AND p.phone_digits LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN friends.friend_relationships r
 *         ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_met_info m
 *         ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('german', :query)
 *           -- Partial/prefix matching on display_name (for queries like "Kür" matching "Kürzer")
 *           OR c.display_name ILIKE :wildcardQuery
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
 * INNER JOIN friends.friend_addresses a ON a.friend_id = bm.id
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
 * INNER JOIN friends.friend_addresses a ON a.friend_id = bm.id
 * WHERE a.city IS NOT NULL
 * GROUP BY a.city
 * 
 * UNION ALL
 * 
 * -- Organization facet (from professional history)
 * SELECT
 *     'organization' as facet_field,
 *     ph.organization as facet_value,
 *     COUNT(DISTINCT bm.id)::int as count
 * FROM base_matches bm
 * INNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id
 * WHERE ph.organization IS NOT NULL
 * GROUP BY ph.organization
 * 
 * UNION ALL
 * 
 * -- Job title facet (from professional history)
 * SELECT
 *     'job_title' as facet_field,
 *     ph.job_title as facet_value,
 *     COUNT(DISTINCT bm.id)::int as count
 * FROM base_matches bm
 * INNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id
 * WHERE ph.job_title IS NOT NULL
 * GROUP BY ph.job_title
 * 
 * UNION ALL
 * 
 * -- Department facet (from professional history)
 * SELECT
 *     'department' as facet_field,
 *     ph.department as facet_value,
 *     COUNT(DISTINCT bm.id)::int as count
 * FROM base_matches bm
 * INNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id
 * WHERE ph.department IS NOT NULL
 * GROUP BY ph.department
 * 
 * UNION ALL
 * 
 * -- Relationship category facet
 * SELECT
 *     'relationship_category' as facet_field,
 *     rt.category as facet_value,
 *     COUNT(DISTINCT bm.id)::int as count
 * FROM base_matches bm
 * INNER JOIN friends.friend_relationships r ON r.friend_id = bm.id
 * INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
 * GROUP BY rt.category
 * 
 * ORDER BY facet_field, count DESC, facet_value
 * ```
 */
export const getFacetCounts = new PreparedQuery<IGetFacetCountsParams,IGetFacetCountsResult>(getFacetCountsIR);


/** 'FilterOnlyList' parameters type */
export interface IFilterOnlyListParams {
  filterCircles?: stringArray | null | void;
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
  circles: Json | null;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  job_title: string | null;
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

const filterOnlyListIR: any = {"usedParamSet":{"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"filterCircles":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":215}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":312,"b":325},{"a":461,"b":474}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":518,"b":528},{"a":661,"b":671}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":751,"b":769},{"a":924,"b":942}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":1019,"b":1033},{"a":1185,"b":1199}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":1277,"b":1293},{"a":1446,"b":1462}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":1523,"b":1549},{"a":1782,"b":1808}]},{"name":"filterCircles","required":false,"transform":{"type":"scalar"},"locs":[{"a":1920,"b":1933},{"a":2027,"b":2040},{"a":2491,"b":2504}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":4040,"b":4046},{"a":4143,"b":4149},{"a":4248,"b":4254},{"a":4349,"b":4355},{"a":4448,"b":4454},{"a":4549,"b":4555}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":4069,"b":4078},{"a":4172,"b":4181},{"a":4275,"b":4284},{"a":4376,"b":4385},{"a":4475,"b":4484},{"a":4576,"b":4585}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":4799,"b":4807}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":4820,"b":4826}]}],"statement":"-- Lists friends with filter support but no search query\nWITH filtered_friends AS (\n    SELECT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      -- Country filter (NULL array means no filter)\n      AND (:filterCountry::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_addresses a\n          WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)\n      ))\n      -- City filter\n      AND (:filterCity::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_addresses a\n          WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)\n      ))\n      -- Organization filter (from professional history)\n      AND (:filterOrganization::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_professional_history ph\n          WHERE ph.friend_id = c.id AND ph.organization = ANY(:filterOrganization)\n      ))\n      -- Job title filter (from professional history)\n      AND (:filterJobTitle::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_professional_history ph\n          WHERE ph.friend_id = c.id AND ph.job_title = ANY(:filterJobTitle)\n      ))\n      -- Department filter (from professional history)\n      AND (:filterDepartment::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_professional_history ph\n          WHERE ph.friend_id = c.id AND ph.department = ANY(:filterDepartment)\n      ))\n      -- Relationship category filter\n      AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_relationships rel\n          INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id\n          WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n      ))\n      -- Circles filter: supports circle IDs and 'no-circle' for friends without circles\n      AND (:filterCircles::text[] IS NULL OR (\n          -- Check for 'no-circle' filter\n          ('no-circle' = ANY(:filterCircles::text[]) AND NOT EXISTS (\n              SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id\n          ))\n          OR\n          -- Check for specific circle IDs (filter out 'no-circle' from array)\n          EXISTS (\n              SELECT 1 FROM friends.friend_circles fc\n              INNER JOIN friends.circles cir ON fc.circle_id = cir.id\n              WHERE fc.friend_id = c.id\n                AND cir.external_id = ANY(array_remove(:filterCircles::text[], 'no-circle')::uuid[])\n          )\n      ))\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM filtered_friends\n),\nsorted_results AS (\n    SELECT\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        -- Get primary professional info\n        (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,\n        (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone,\n        -- Get circles for this friend\n        (SELECT COALESCE(json_agg(json_build_object(\n            'external_id', ci.external_id,\n            'name', ci.name,\n            'color', ci.color\n        ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)\n         FROM friends.circles ci\n         INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id\n         WHERE fci.friend_id = c.id\n        ) as circles,\n        -- Materialise the page order (as PaginatedFullTextSearch/FacetedSearch\n        -- do): the CROSS JOIN below is free to reorder the CTE's rows.\n        row_number() OVER (\n            ORDER BY\n                CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,\n                CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,\n                CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,\n                CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,\n                CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC,\n                CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,\n                c.display_name ASC\n        ) as sort_position\n    FROM filtered_friends fc\n    INNER JOIN friends.friends c ON c.id = fc.id\n    ORDER BY sort_position\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.primary_email,\n    sr.primary_phone,\n    sr.circles,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc\nORDER BY sr.sort_position"};

/**
 * Query generated from SQL:
 * ```
 * -- Lists friends with filter support but no search query
 * WITH filtered_friends AS (
 *     SELECT c.id
 *     FROM friends.friends c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       -- Country filter (NULL array means no filter)
 *       AND (:filterCountry::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM friends.friend_addresses a
 *           WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)
 *       ))
 *       -- City filter
 *       AND (:filterCity::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM friends.friend_addresses a
 *           WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)
 *       ))
 *       -- Organization filter (from professional history)
 *       AND (:filterOrganization::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM friends.friend_professional_history ph
 *           WHERE ph.friend_id = c.id AND ph.organization = ANY(:filterOrganization)
 *       ))
 *       -- Job title filter (from professional history)
 *       AND (:filterJobTitle::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM friends.friend_professional_history ph
 *           WHERE ph.friend_id = c.id AND ph.job_title = ANY(:filterJobTitle)
 *       ))
 *       -- Department filter (from professional history)
 *       AND (:filterDepartment::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM friends.friend_professional_history ph
 *           WHERE ph.friend_id = c.id AND ph.department = ANY(:filterDepartment)
 *       ))
 *       -- Relationship category filter
 *       AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (
 *           SELECT 1 FROM friends.friend_relationships rel
 *           INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id
 *           WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)
 *       ))
 *       -- Circles filter: supports circle IDs and 'no-circle' for friends without circles
 *       AND (:filterCircles::text[] IS NULL OR (
 *           -- Check for 'no-circle' filter
 *           ('no-circle' = ANY(:filterCircles::text[]) AND NOT EXISTS (
 *               SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id
 *           ))
 *           OR
 *           -- Check for specific circle IDs (filter out 'no-circle' from array)
 *           EXISTS (
 *               SELECT 1 FROM friends.friend_circles fc
 *               INNER JOIN friends.circles cir ON fc.circle_id = cir.id
 *               WHERE fc.friend_id = c.id
 *                 AND cir.external_id = ANY(array_remove(:filterCircles::text[], 'no-circle')::uuid[])
 *           )
 *       ))
 * ),
 * total_count AS (
 *     SELECT COUNT(*)::int as count FROM filtered_friends
 * ),
 * sorted_results AS (
 *     SELECT
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         -- Get primary professional info
 *         (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,
 *         (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,
 *         (SELECT e.email_address FROM friends.friend_emails e
 *          WHERE e.friend_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,
 *         (SELECT p.phone_number FROM friends.friend_phones p
 *          WHERE p.friend_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone,
 *         -- Get circles for this friend
 *         (SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', ci.external_id,
 *             'name', ci.name,
 *             'color', ci.color
 *         ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)
 *          FROM friends.circles ci
 *          INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id
 *          WHERE fci.friend_id = c.id
 *         ) as circles,
 *         -- Materialise the page order (as PaginatedFullTextSearch/FacetedSearch
 *         -- do): the CROSS JOIN below is free to reorder the CTE's rows.
 *         row_number() OVER (
 *             ORDER BY
 *                 CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,
 *                 CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,
 *                 CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,
 *                 CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,
 *                 CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC,
 *                 CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,
 *                 c.display_name ASC
 *         ) as sort_position
 *     FROM filtered_friends fc
 *     INNER JOIN friends.friends c ON c.id = fc.id
 *     ORDER BY sort_position
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
 *     sr.circles,
 *     tc.count as total_count
 * FROM sorted_results sr
 * CROSS JOIN total_count tc
 * ORDER BY sr.sort_position
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

const getAllFacetCountsIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":195,"b":209}]}],"statement":"-- Gets facet counts for all friends (no search filter)\nWITH all_friends AS (\n    SELECT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_addresses a ON a.friend_id = ac.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_addresses a ON a.friend_id = ac.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet (from professional history)\nSELECT\n    'organization' as facet_field,\n    ph.organization as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = ac.id\nWHERE ph.organization IS NOT NULL\nGROUP BY ph.organization\n\nUNION ALL\n\n-- Job title facet (from professional history)\nSELECT\n    'job_title' as facet_field,\n    ph.job_title as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = ac.id\nWHERE ph.job_title IS NOT NULL\nGROUP BY ph.job_title\n\nUNION ALL\n\n-- Department facet (from professional history)\nSELECT\n    'department' as facet_field,\n    ph.department as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = ac.id\nWHERE ph.department IS NOT NULL\nGROUP BY ph.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_relationships r ON r.friend_id = ac.id\nINNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets facet counts for all friends (no search filter)
 * WITH all_friends AS (
 *     SELECT c.id
 *     FROM friends.friends c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 * )
 * -- Country facet
 * SELECT
 *     'country' as facet_field,
 *     a.country as facet_value,
 *     COUNT(DISTINCT ac.id)::int as count
 * FROM all_friends ac
 * INNER JOIN friends.friend_addresses a ON a.friend_id = ac.id
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
 * FROM all_friends ac
 * INNER JOIN friends.friend_addresses a ON a.friend_id = ac.id
 * WHERE a.city IS NOT NULL
 * GROUP BY a.city
 * 
 * UNION ALL
 * 
 * -- Organization facet (from professional history)
 * SELECT
 *     'organization' as facet_field,
 *     ph.organization as facet_value,
 *     COUNT(DISTINCT ac.id)::int as count
 * FROM all_friends ac
 * INNER JOIN friends.friend_professional_history ph ON ph.friend_id = ac.id
 * WHERE ph.organization IS NOT NULL
 * GROUP BY ph.organization
 * 
 * UNION ALL
 * 
 * -- Job title facet (from professional history)
 * SELECT
 *     'job_title' as facet_field,
 *     ph.job_title as facet_value,
 *     COUNT(DISTINCT ac.id)::int as count
 * FROM all_friends ac
 * INNER JOIN friends.friend_professional_history ph ON ph.friend_id = ac.id
 * WHERE ph.job_title IS NOT NULL
 * GROUP BY ph.job_title
 * 
 * UNION ALL
 * 
 * -- Department facet (from professional history)
 * SELECT
 *     'department' as facet_field,
 *     ph.department as facet_value,
 *     COUNT(DISTINCT ac.id)::int as count
 * FROM all_friends ac
 * INNER JOIN friends.friend_professional_history ph ON ph.friend_id = ac.id
 * WHERE ph.department IS NOT NULL
 * GROUP BY ph.department
 * 
 * UNION ALL
 * 
 * -- Relationship category facet
 * SELECT
 *     'relationship_category' as facet_field,
 *     rt.category as facet_value,
 *     COUNT(DISTINCT ac.id)::int as count
 * FROM all_friends ac
 * INNER JOIN friends.friend_relationships r ON r.friend_id = ac.id
 * INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
 * GROUP BY rt.category
 * 
 * ORDER BY facet_field, count DESC, facet_value
 * ```
 */
export const getAllFacetCounts = new PreparedQuery<IGetAllFacetCountsParams,IGetAllFacetCountsResult>(getAllFacetCountsIR);


