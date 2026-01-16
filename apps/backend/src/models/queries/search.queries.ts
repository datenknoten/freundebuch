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

/** 'FullTextSearchFriends' query type */
export interface IFullTextSearchFriendsQuery {
  params: IFullTextSearchFriendsParams;
  result: IFullTextSearchFriendsResult;
}

const fullTextSearchFriendsIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"limit":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":349,"b":354},{"a":527,"b":532},{"a":1111,"b":1116},{"a":1280,"b":1285},{"a":1724,"b":1729},{"a":2473,"b":2478}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1001,"b":1014},{"a":1407,"b":1420},{"a":1516,"b":1529},{"a":1862,"b":1875}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1557,"b":1571}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":2993,"b":2998}]}],"statement":"WITH matching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on friend fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\nSELECT\n    mc.external_id,\n    mc.display_name,\n    mc.photo_thumbnail_url,\n    mc.organization,\n    mc.job_title,\n    mc.fts_rank as rank,\n    mc.match_source,\n    -- Generate headline/snippet for matched content\n    ts_headline(\n        'english',\n        COALESCE(mc.display_name, '') || ' ' ||\n        COALESCE(mc.organization, '') || ' ' ||\n        COALESCE(mc.work_notes, ''),\n        websearch_to_tsquery('english', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    -- Get primary email\n    (SELECT e.email_address FROM friends.friend_emails e\n     WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n    -- Get primary phone\n    (SELECT p.phone_number FROM friends.friend_phones p\n     WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM matching_friends mc\nORDER BY mc.fts_rank DESC, mc.display_name ASC\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * WITH matching_friends AS (
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

const paginatedFullTextSearchIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":393,"b":398},{"a":571,"b":576},{"a":1155,"b":1160},{"a":1324,"b":1329},{"a":1768,"b":1773},{"a":2506,"b":2511}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1045,"b":1058},{"a":1451,"b":1464},{"a":1560,"b":1573},{"a":1906,"b":1919}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1601,"b":1615}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":3040,"b":3046},{"a":3131,"b":3137},{"a":3220,"b":3226},{"a":3316,"b":3322},{"a":3414,"b":3420},{"a":3508,"b":3514},{"a":3600,"b":3606},{"a":3694,"b":3700}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":3066,"b":3075},{"a":3157,"b":3166},{"a":3249,"b":3258},{"a":3345,"b":3354},{"a":3441,"b":3450},{"a":3535,"b":3544},{"a":3627,"b":3636},{"a":3721,"b":3730}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":3806,"b":3814}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3827,"b":3833}]}],"statement":"WITH matching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        c.created_at,\n        c.updated_at,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on friend fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_friends\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        -- Generate headline/snippet for matched content\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE(mc.work_notes, ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        -- Get primary email\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        -- Get primary phone\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_friends mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

/**
 * Query generated from SQL:
 * ```
 * WITH matching_friends AS (
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

const facetedSearchIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"filterCircles":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":362,"b":375},{"a":768,"b":781},{"a":877,"b":890},{"a":1176,"b":1189},{"a":4247,"b":4260}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":472,"b":477},{"a":641,"b":646},{"a":1038,"b":1043},{"a":3753,"b":3758},{"a":3860,"b":3865},{"a":4357,"b":4362},{"a":4526,"b":4531},{"a":4917,"b":4922}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":918,"b":932}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":1552,"b":1565},{"a":1705,"b":1718}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":1768,"b":1778},{"a":1915,"b":1925}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":1983,"b":2001},{"a":2043,"b":2061}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":2106,"b":2120},{"a":2159,"b":2173}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":2219,"b":2235},{"a":2275,"b":2291}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":2348,"b":2374},{"a":2613,"b":2639}]},{"name":"filterCircles","required":false,"transform":{"type":"scalar"},"locs":[{"a":2757,"b":2770},{"a":2868,"b":2881},{"a":3350,"b":3363}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":5815,"b":5821},{"a":5906,"b":5912},{"a":5995,"b":6001},{"a":6091,"b":6097},{"a":6189,"b":6195},{"a":6283,"b":6289},{"a":6375,"b":6381},{"a":6469,"b":6475}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":5841,"b":5850},{"a":5932,"b":5941},{"a":6024,"b":6033},{"a":6120,"b":6129},{"a":6216,"b":6225},{"a":6310,"b":6319},{"a":6402,"b":6411},{"a":6496,"b":6505}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":6581,"b":6589}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":6602,"b":6608}]}],"statement":"WITH base_matches AS (\n    -- Base query matching friends via FTS and other search methods\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\nfiltered_matches AS (\n    -- Apply facet filters to base matches\n    SELECT bm.id\n    FROM base_matches bm\n    INNER JOIN friends.friends c ON c.id = bm.id\n    WHERE\n        -- Country filter (NULL array means no filter)\n        (:filterCountry::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_addresses a\n            WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)\n        ))\n        -- City filter\n        AND (:filterCity::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_addresses a\n            WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)\n        ))\n        -- Organization filter\n        AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))\n        -- Job title filter\n        AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))\n        -- Department filter\n        AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))\n        -- Relationship category filter\n        AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_relationships rel\n            INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id\n            WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n        ))\n        -- Circles filter: supports circle IDs and 'no-circle' for friends without circles\n        AND (:filterCircles::text[] IS NULL OR (\n            -- Check for 'no-circle' filter\n            ('no-circle' = ANY(:filterCircles::text[]) AND NOT EXISTS (\n                SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id\n            ))\n            OR\n            -- Check for specific circle IDs (filter out 'no-circle' from array)\n            EXISTS (\n                SELECT 1 FROM friends.friend_circles fc\n                INNER JOIN friends.circles cir ON fc.circle_id = cir.id\n                WHERE fc.friend_id = c.id\n                  AND cir.external_id = ANY(array_remove(:filterCircles::text[], 'no-circle')::uuid[])\n            )\n        ))\n),\nmatching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        c.created_at,\n        c.updated_at,\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            ELSE 'notes'\n        END as match_source\n    FROM filtered_matches fm\n    INNER JOIN friends.friends c ON c.id = fm.id\n    -- Re-join for match_source determination\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_friends\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE(mc.work_notes, ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone,\n        -- Get circles for this friend\n        (SELECT COALESCE(json_agg(json_build_object(\n            'external_id', ci.external_id,\n            'name', ci.name,\n            'color', ci.color\n        ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)\n         FROM friends.circles ci\n         INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id\n         WHERE fci.friend_id = mc.id\n        ) as circles\n    FROM matching_friends mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    sr.circles,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *         -- Organization filter
 *         AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))
 *         -- Job title filter
 *         AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))
 *         -- Department filter
 *         AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))
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
 *         c.organization,
 *         c.job_title,
 *         c.work_notes,
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

const getFacetCountsIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":361,"b":374},{"a":767,"b":780},{"a":876,"b":889},{"a":1175,"b":1188}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":471,"b":476},{"a":640,"b":645},{"a":1037,"b":1042}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":917,"b":931}]}],"statement":"WITH base_matches AS (\n    -- Base query matching friends via FTS (same as FacetedSearch)\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(:query, '[^0-9]', '', 'g') != ''  -- Only match if query has digits\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- Partial/prefix matching on display_name (for queries like \"Kür\" matching \"Kürzer\")\n          OR c.display_name ILIKE :wildcardQuery\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_addresses a ON a.friend_id = bm.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_addresses a ON a.friend_id = bm.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet\nSELECT\n    'organization' as facet_field,\n    c.organization as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN friends.friends c ON c.id = bm.id\nWHERE c.organization IS NOT NULL\nGROUP BY c.organization\n\nUNION ALL\n\n-- Job title facet\nSELECT\n    'job_title' as facet_field,\n    c.job_title as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN friends.friends c ON c.id = bm.id\nWHERE c.job_title IS NOT NULL\nGROUP BY c.job_title\n\nUNION ALL\n\n-- Department facet\nSELECT\n    'department' as facet_field,\n    c.department as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN friends.friends c ON c.id = bm.id\nWHERE c.department IS NOT NULL\nGROUP BY c.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_relationships r ON r.friend_id = bm.id\nINNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

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
 * -- Organization facet
 * SELECT
 *     'organization' as facet_field,
 *     c.organization as facet_value,
 *     COUNT(*)::int as count
 * FROM base_matches bm
 * INNER JOIN friends.friends c ON c.id = bm.id
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
 * INNER JOIN friends.friends c ON c.id = bm.id
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
 * INNER JOIN friends.friends c ON c.id = bm.id
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

const filterOnlyListIR: any = {"usedParamSet":{"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"filterCircles":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":215}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":312,"b":325},{"a":461,"b":474}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":518,"b":528},{"a":661,"b":671}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":723,"b":741},{"a":783,"b":801}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":842,"b":856},{"a":895,"b":909}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":951,"b":967},{"a":1007,"b":1023}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":1076,"b":1102},{"a":1335,"b":1361}]},{"name":"filterCircles","required":false,"transform":{"type":"scalar"},"locs":[{"a":1473,"b":1486},{"a":1580,"b":1593},{"a":2044,"b":2057}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":3178,"b":3184},{"a":3273,"b":3279},{"a":3370,"b":3376},{"a":3463,"b":3469},{"a":3554,"b":3560},{"a":3647,"b":3653}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":3207,"b":3216},{"a":3302,"b":3311},{"a":3397,"b":3406},{"a":3490,"b":3499},{"a":3581,"b":3590},{"a":3674,"b":3683}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":3757,"b":3765}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3778,"b":3784}]}],"statement":"-- Lists friends with filter support but no search query\nWITH filtered_friends AS (\n    SELECT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      -- Country filter (NULL array means no filter)\n      AND (:filterCountry::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_addresses a\n          WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)\n      ))\n      -- City filter\n      AND (:filterCity::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_addresses a\n          WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)\n      ))\n      -- Organization filter\n      AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))\n      -- Job title filter\n      AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))\n      -- Department filter\n      AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))\n      -- Relationship category filter\n      AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_relationships rel\n          INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id\n          WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n      ))\n      -- Circles filter: supports circle IDs and 'no-circle' for friends without circles\n      AND (:filterCircles::text[] IS NULL OR (\n          -- Check for 'no-circle' filter\n          ('no-circle' = ANY(:filterCircles::text[]) AND NOT EXISTS (\n              SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id\n          ))\n          OR\n          -- Check for specific circle IDs (filter out 'no-circle' from array)\n          EXISTS (\n              SELECT 1 FROM friends.friend_circles fc\n              INNER JOIN friends.circles cir ON fc.circle_id = cir.id\n              WHERE fc.friend_id = c.id\n                AND cir.external_id = ANY(array_remove(:filterCircles::text[], 'no-circle')::uuid[])\n          )\n      ))\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM filtered_friends\n),\nsorted_results AS (\n    SELECT\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone,\n        -- Get circles for this friend\n        (SELECT COALESCE(json_agg(json_build_object(\n            'external_id', ci.external_id,\n            'name', ci.name,\n            'color', ci.color\n        ) ORDER BY ci.sort_order ASC, ci.name ASC), '[]'::json)\n         FROM friends.circles ci\n         INNER JOIN friends.friend_circles fci ON fci.circle_id = ci.id\n         WHERE fci.friend_id = c.id\n        ) as circles\n    FROM filtered_friends fc\n    INNER JOIN friends.friends c ON c.id = fc.id\n    ORDER BY\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,\n        c.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.primary_email,\n    sr.primary_phone,\n    sr.circles,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *       -- Organization filter
 *       AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))
 *       -- Job title filter
 *       AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))
 *       -- Department filter
 *       AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))
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
 *         c.organization,
 *         c.job_title,
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

const getAllFacetCountsIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":195,"b":209}]}],"statement":"-- Gets facet counts for all friends (no search filter)\nWITH all_friends AS (\n    SELECT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_addresses a ON a.friend_id = ac.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_addresses a ON a.friend_id = ac.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet\nSELECT\n    'organization' as facet_field,\n    c.organization as facet_value,\n    COUNT(*)::int as count\nFROM all_friends ac\nINNER JOIN friends.friends c ON c.id = ac.id\nWHERE c.organization IS NOT NULL\nGROUP BY c.organization\n\nUNION ALL\n\n-- Job title facet\nSELECT\n    'job_title' as facet_field,\n    c.job_title as facet_value,\n    COUNT(*)::int as count\nFROM all_friends ac\nINNER JOIN friends.friends c ON c.id = ac.id\nWHERE c.job_title IS NOT NULL\nGROUP BY c.job_title\n\nUNION ALL\n\n-- Department facet\nSELECT\n    'department' as facet_field,\n    c.department as facet_value,\n    COUNT(*)::int as count\nFROM all_friends ac\nINNER JOIN friends.friends c ON c.id = ac.id\nWHERE c.department IS NOT NULL\nGROUP BY c.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT ac.id)::int as count\nFROM all_friends ac\nINNER JOIN friends.friend_relationships r ON r.friend_id = ac.id\nINNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

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
 * -- Organization facet
 * SELECT
 *     'organization' as facet_field,
 *     c.organization as facet_value,
 *     COUNT(*)::int as count
 * FROM all_friends ac
 * INNER JOIN friends.friends c ON c.id = ac.id
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
 * FROM all_friends ac
 * INNER JOIN friends.friends c ON c.id = ac.id
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
 * FROM all_friends ac
 * INNER JOIN friends.friends c ON c.id = ac.id
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
 * FROM all_friends ac
 * INNER JOIN friends.friend_relationships r ON r.friend_id = ac.id
 * INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
 * GROUP BY rt.category
 * 
 * ORDER BY facet_field, count DESC, facet_value
 * ```
 */
export const getAllFacetCounts = new PreparedQuery<IGetAllFacetCountsParams,IGetAllFacetCountsResult>(getAllFacetCountsIR);


