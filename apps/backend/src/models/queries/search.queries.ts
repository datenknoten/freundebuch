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

const fullTextSearchFriendsIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"limit":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":767,"b":772},{"a":945,"b":950},{"a":1529,"b":1534},{"a":1698,"b":1703},{"a":2142,"b":2147},{"a":2891,"b":2896}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1419,"b":1432},{"a":1825,"b":1838},{"a":1934,"b":1947},{"a":2280,"b":2293}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1975,"b":1989}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":3411,"b":3416}]}],"statement":"WITH matching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        -- Get primary professional info\n        (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,\n        (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,\n        (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on friend fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\nSELECT\n    mc.external_id,\n    mc.display_name,\n    mc.photo_thumbnail_url,\n    mc.organization,\n    mc.job_title,\n    mc.fts_rank as rank,\n    mc.match_source,\n    -- Generate headline/snippet for matched content\n    ts_headline(\n        'english',\n        COALESCE(mc.display_name, '') || ' ' ||\n        COALESCE(mc.organization, '') || ' ' ||\n        COALESCE(mc.work_notes, ''),\n        websearch_to_tsquery('english', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    -- Get primary email\n    (SELECT e.email_address FROM friends.friend_emails e\n     WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n    -- Get primary phone\n    (SELECT p.phone_number FROM friends.friend_phones p\n     WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM matching_friends mc\nORDER BY mc.fts_rank DESC, mc.display_name ASC\nLIMIT :limit"};

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
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
 *         -- Determine match source (using joined tables for efficiency)
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'
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
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN friends.friend_relationships r
 *         ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_met_info m
 *         ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           -- Full-text search on friend fields
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           -- Partial/prefix matching on display_name (for queries like "Kür" matching "Kürzer")
 *           OR c.display_name ILIKE :wildcardQuery
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
 *     (SELECT e.email_address FROM friends.friend_emails e
 *      WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     -- Get primary phone
 *     (SELECT p.phone_number FROM friends.friend_phones p
 *      WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
 * FROM matching_friends mc
 * ORDER BY mc.fts_rank DESC, mc.display_name ASC
 * LIMIT :limit
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

const paginatedFullTextSearchIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":811,"b":816},{"a":989,"b":994},{"a":1573,"b":1578},{"a":1742,"b":1747},{"a":2186,"b":2191},{"a":2924,"b":2929}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1463,"b":1476},{"a":1869,"b":1882},{"a":1978,"b":1991},{"a":2324,"b":2337}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2019,"b":2033}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":3458,"b":3464},{"a":3549,"b":3555},{"a":3638,"b":3644},{"a":3734,"b":3740},{"a":3832,"b":3838},{"a":3926,"b":3932},{"a":4018,"b":4024},{"a":4112,"b":4118}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":3484,"b":3493},{"a":3575,"b":3584},{"a":3667,"b":3676},{"a":3763,"b":3772},{"a":3859,"b":3868},{"a":3953,"b":3962},{"a":4045,"b":4054},{"a":4139,"b":4148}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":4224,"b":4232}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":4245,"b":4251}]}],"statement":"WITH matching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        -- Get primary professional info\n        (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,\n        (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,\n        (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,\n        c.created_at,\n        c.updated_at,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on friend fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_friends\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        -- Generate headline/snippet for matched content\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE(mc.work_notes, ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        -- Get primary email\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        -- Get primary phone\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_friends mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
 *         -- Determine match source (using joined tables for efficiency)
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'
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
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN friends.friend_relationships r
 *         ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_met_info m
 *         ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           -- Full-text search on friend fields
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           -- Partial/prefix matching on display_name (for queries like "Kür" matching "Kürzer")
 *           OR c.display_name ILIKE :wildcardQuery
 *           -- OR matches from joined tables
 *           OR e.id IS NOT NULL
 *           OR p.id IS NOT NULL
 *           OR r.id IS NOT NULL
 *           OR m.id IS NOT NULL
 *       )
 * ),
 * total_count AS (
 *     SELECT COUNT(*)::int as count FROM matching_friends
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
 *         (SELECT e.email_address FROM friends.friend_emails e
 *          WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
 *         -- Get primary phone
 *         (SELECT p.phone_number FROM friends.friend_phones p
 *          WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
 *     FROM matching_friends mc
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

const facetedSearchIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"filterCircles":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":362,"b":375},{"a":768,"b":781},{"a":877,"b":890},{"a":1176,"b":1189},{"a":5130,"b":5143}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":472,"b":477},{"a":641,"b":646},{"a":1038,"b":1043},{"a":4636,"b":4641},{"a":4743,"b":4748},{"a":5240,"b":5245},{"a":5409,"b":5414},{"a":5800,"b":5805}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":918,"b":932}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":1552,"b":1565},{"a":1705,"b":1718}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":1768,"b":1778},{"a":1915,"b":1925}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":2011,"b":2029},{"a":2188,"b":2206}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":2289,"b":2303},{"a":2459,"b":2473}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":2557,"b":2573},{"a":2730,"b":2746}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":2813,"b":2839},{"a":3078,"b":3104}]},{"name":"filterCircles","required":false,"transform":{"type":"scalar"},"locs":[{"a":3222,"b":3235},{"a":3333,"b":3346},{"a":3815,"b":3828}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":6698,"b":6704},{"a":6789,"b":6795},{"a":6878,"b":6884},{"a":6974,"b":6980},{"a":7072,"b":7078},{"a":7166,"b":7172},{"a":7258,"b":7264},{"a":7352,"b":7358}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":6724,"b":6733},{"a":6815,"b":6824},{"a":6907,"b":6916},{"a":7003,"b":7012},{"a":7099,"b":7108},{"a":7193,"b":7202},{"a":7285,"b":7294},{"a":7379,"b":7388}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":7464,"b":7472}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":7485,"b":7491}]}],"statement":"WITH base_matches AS (\n    -- Base query matching friends via FTS and other search methods\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\nfiltered_matches AS (\n    -- Apply facet filters to base matches\n    SELECT bm.id\n    FROM base_matches bm\n    INNER JOIN friends.friends c ON c.id = bm.id\n    WHERE\n        -- Country filter (NULL array means no filter)\n        (:filterCountry::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_addresses a\n            WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)\n        ))\n        -- City filter\n        AND (:filterCity::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_addresses a\n            WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)\n        ))\n        -- Organization filter (from professional history)\n        AND (:filterOrganization::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_professional_history ph\n            WHERE ph.friend_id = c.id AND ph.organization = ANY(:filterOrganization)\n        ))\n        -- Job title filter (from professional history)\n        AND (:filterJobTitle::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_professional_history ph\n            WHERE ph.friend_id = c.id AND ph.job_title = ANY(:filterJobTitle)\n        ))\n        -- Department filter (from professional history)\n        AND (:filterDepartment::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_professional_history ph\n            WHERE ph.friend_id = c.id AND ph.department = ANY(:filterDepartment)\n        ))\n        -- Relationship category filter\n        AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_relationships rel\n            INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id\n            WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n        ))\n        -- Circles filter: supports circle IDs and 'no-circle' for friends without circles\n        AND (:filterCircles::text[] IS NULL OR (\n            -- Check for 'no-circle' filter\n            ('no-circle' = ANY(:filterCircles::text[]) AND NOT EXISTS (\n                SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id\n            ))\n            OR\n            -- Check for specific circle IDs (filter out 'no-circle' from array)\n            EXISTS (\n                SELECT 1 FROM friends.friend_circles fc\n                INNER JOIN friends.circles cir ON fc.circle_id = cir.id\n                WHERE fc.friend_id = c.id\n                  AND cir.external_id = ANY(array_remove(:filterCircles::text[], 'no-circle')::uuid[])\n            )\n        ))\n),\nmatching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        -- Get primary professional info\n        (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,\n        (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,\n        (SELECT ph.notes FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as work_notes,\n        c.created_at,\n        c.updated_at,\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            ELSE 'notes'\n        END as match_source\n    FROM filtered_matches fm\n    INNER JOIN friends.friends c ON c.id = fm.id\n    -- Re-join for match_source determination\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_friends\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE(mc.work_notes, ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone,\n        -- Get circles for this friend\n        (SELECT COALESCE(json_agg(json_build_object(\n            'external_id', ci.external_id,\n            'name', ci.name,\n            'color', ci.color\n        ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)\n         FROM friends.circles ci\n         INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id\n         WHERE fci.friend_id = mc.id\n        ) as circles\n    FROM matching_friends mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    sr.circles,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN friends.friend_relationships r
 *         ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_met_info m
 *         ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
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
 *         COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'
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
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 * ),
 * total_count AS (
 *     SELECT COUNT(*)::int as count FROM matching_friends
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
 *         (SELECT e.email_address FROM friends.friend_emails e
 *          WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
 *         (SELECT p.phone_number FROM friends.friend_phones p
 *          WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone,
 *         -- Get circles for this friend
 *         (SELECT COALESCE(json_agg(json_build_object(
 *             'external_id', ci.external_id,
 *             'name', ci.name,
 *             'color', ci.color
 *         ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)
 *          FROM friends.circles ci
 *          INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id
 *          WHERE fci.friend_id = mc.id
 *         ) as circles
 *     FROM matching_friends mc
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
 *     sr.circles,
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

const getFacetCountsIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":361,"b":374},{"a":767,"b":780},{"a":876,"b":889},{"a":1175,"b":1188}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":471,"b":476},{"a":640,"b":645},{"a":1037,"b":1042}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":917,"b":931}]}],"statement":"WITH base_matches AS (\n    -- Base query matching friends via FTS (same as FacetedSearch)\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_addresses a ON a.friend_id = bm.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_addresses a ON a.friend_id = bm.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet (from professional history)\nSELECT\n    'organization' as facet_field,\n    ph.organization as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id\nWHERE ph.organization IS NOT NULL\nGROUP BY ph.organization\n\nUNION ALL\n\n-- Job title facet (from professional history)\nSELECT\n    'job_title' as facet_field,\n    ph.job_title as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id\nWHERE ph.job_title IS NOT NULL\nGROUP BY ph.job_title\n\nUNION ALL\n\n-- Department facet (from professional history)\nSELECT\n    'department' as facet_field,\n    ph.department as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_professional_history ph ON ph.friend_id = bm.id\nWHERE ph.department IS NOT NULL\nGROUP BY ph.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_relationships r ON r.friend_id = bm.id\nINNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

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
 *         AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *             LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *     LEFT JOIN friends.friend_relationships r
 *         ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
 *     LEFT JOIN friends.friend_met_info m
 *         ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
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

const filterOnlyListIR: any = {"usedParamSet":{"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"filterCircles":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":215}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":312,"b":325},{"a":461,"b":474}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":518,"b":528},{"a":661,"b":671}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":751,"b":769},{"a":924,"b":942}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":1019,"b":1033},{"a":1185,"b":1199}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":1277,"b":1293},{"a":1446,"b":1462}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":1523,"b":1549},{"a":1782,"b":1808}]},{"name":"filterCircles","required":false,"transform":{"type":"scalar"},"locs":[{"a":1920,"b":1933},{"a":2027,"b":2040},{"a":2491,"b":2504}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":3921,"b":3927},{"a":4016,"b":4022},{"a":4113,"b":4119},{"a":4206,"b":4212},{"a":4297,"b":4303},{"a":4390,"b":4396}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":3950,"b":3959},{"a":4045,"b":4054},{"a":4140,"b":4149},{"a":4233,"b":4242},{"a":4324,"b":4333},{"a":4417,"b":4426}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":4500,"b":4508}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":4521,"b":4527}]}],"statement":"-- Lists friends with filter support but no search query\nWITH filtered_friends AS (\n    SELECT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      -- Country filter (NULL array means no filter)\n      AND (:filterCountry::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_addresses a\n          WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)\n      ))\n      -- City filter\n      AND (:filterCity::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_addresses a\n          WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)\n      ))\n      -- Organization filter (from professional history)\n      AND (:filterOrganization::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_professional_history ph\n          WHERE ph.friend_id = c.id AND ph.organization = ANY(:filterOrganization)\n      ))\n      -- Job title filter (from professional history)\n      AND (:filterJobTitle::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_professional_history ph\n          WHERE ph.friend_id = c.id AND ph.job_title = ANY(:filterJobTitle)\n      ))\n      -- Department filter (from professional history)\n      AND (:filterDepartment::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_professional_history ph\n          WHERE ph.friend_id = c.id AND ph.department = ANY(:filterDepartment)\n      ))\n      -- Relationship category filter\n      AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_relationships rel\n          INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id\n          WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n      ))\n      -- Circles filter: supports circle IDs and 'no-circle' for friends without circles\n      AND (:filterCircles::text[] IS NULL OR (\n          -- Check for 'no-circle' filter\n          ('no-circle' = ANY(:filterCircles::text[]) AND NOT EXISTS (\n              SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id\n          ))\n          OR\n          -- Check for specific circle IDs (filter out 'no-circle' from array)\n          EXISTS (\n              SELECT 1 FROM friends.friend_circles fc\n              INNER JOIN friends.circles cir ON fc.circle_id = cir.id\n              WHERE fc.friend_id = c.id\n                AND cir.external_id = ANY(array_remove(:filterCircles::text[], 'no-circle')::uuid[])\n          )\n      ))\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM filtered_friends\n),\nsorted_results AS (\n    SELECT\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        -- Get primary professional info\n        (SELECT ph.organization FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as organization,\n        (SELECT ph.job_title FROM friends.friend_professional_history ph WHERE ph.friend_id = c.id AND ph.is_primary = true LIMIT 1) as job_title,\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone,\n        -- Get circles for this friend\n        (SELECT COALESCE(json_agg(json_build_object(\n            'external_id', ci.external_id,\n            'name', ci.name,\n            'color', ci.color\n        ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)\n         FROM friends.circles ci\n         INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id\n         WHERE fci.friend_id = c.id\n        ) as circles\n    FROM filtered_friends fc\n    INNER JOIN friends.friends c ON c.id = fc.id\n    ORDER BY\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,\n        c.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.primary_email,\n    sr.primary_phone,\n    sr.circles,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *         ) as circles
 *     FROM filtered_friends fc
 *     INNER JOIN friends.friends c ON c.id = fc.id
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
 *     sr.circles,
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


