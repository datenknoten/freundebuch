/** Types generated for queries found in "src/models/queries/search.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

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

const fullTextSearchFriendsIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"limit":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":349,"b":354},{"a":527,"b":532},{"a":1185,"b":1190},{"a":1629,"b":1634},{"a":2233,"b":2238}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1001,"b":1014},{"a":1312,"b":1325},{"a":1421,"b":1434}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1462,"b":1476}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":2753,"b":2758}]}],"statement":"WITH matching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on friend fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\nSELECT\n    mc.external_id,\n    mc.display_name,\n    mc.photo_thumbnail_url,\n    mc.organization,\n    mc.job_title,\n    mc.fts_rank as rank,\n    mc.match_source,\n    -- Generate headline/snippet for matched content\n    ts_headline(\n        'english',\n        COALESCE(mc.display_name, '') || ' ' ||\n        COALESCE(mc.organization, '') || ' ' ||\n        COALESCE(mc.work_notes, ''),\n        websearch_to_tsquery('english', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    -- Get primary email\n    (SELECT e.email_address FROM friends.friend_emails e\n     WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n    -- Get primary phone\n    (SELECT p.phone_number FROM friends.friend_phones p\n     WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM matching_friends mc\nORDER BY mc.fts_rank DESC, mc.display_name ASC\nLIMIT :limit"};

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

const paginatedFullTextSearchIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":393,"b":398},{"a":571,"b":576},{"a":1229,"b":1234},{"a":1673,"b":1678},{"a":2266,"b":2271}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1045,"b":1058},{"a":1356,"b":1369},{"a":1465,"b":1478}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1506,"b":1520}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":2800,"b":2806},{"a":2891,"b":2897},{"a":2980,"b":2986},{"a":3076,"b":3082},{"a":3174,"b":3180},{"a":3268,"b":3274},{"a":3360,"b":3366},{"a":3454,"b":3460}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":2826,"b":2835},{"a":2917,"b":2926},{"a":3009,"b":3018},{"a":3105,"b":3114},{"a":3201,"b":3210},{"a":3295,"b":3304},{"a":3387,"b":3396},{"a":3481,"b":3490}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":3566,"b":3574}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3587,"b":3593}]}],"statement":"WITH matching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        c.created_at,\n        c.updated_at,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on friend fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_friends\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        -- Generate headline/snippet for matched content\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE(mc.work_notes, ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        -- Get primary email\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        -- Get primary phone\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_friends mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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

const facetedSearchIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":362,"b":375},{"a":673,"b":686},{"a":782,"b":795},{"a":3239,"b":3252}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":546,"b":551},{"a":943,"b":948},{"a":2745,"b":2750},{"a":2852,"b":2857},{"a":3423,"b":3428},{"a":3814,"b":3819}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":823,"b":837}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":1312,"b":1325},{"a":1465,"b":1478}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":1528,"b":1538},{"a":1675,"b":1685}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":1743,"b":1761},{"a":1803,"b":1821}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":1866,"b":1880},{"a":1919,"b":1933}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":1979,"b":1995},{"a":2035,"b":2051}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":2108,"b":2134},{"a":2373,"b":2399}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":4290,"b":4296},{"a":4381,"b":4387},{"a":4470,"b":4476},{"a":4566,"b":4572},{"a":4664,"b":4670},{"a":4758,"b":4764},{"a":4850,"b":4856},{"a":4944,"b":4950}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":4316,"b":4325},{"a":4407,"b":4416},{"a":4499,"b":4508},{"a":4595,"b":4604},{"a":4691,"b":4700},{"a":4785,"b":4794},{"a":4877,"b":4886},{"a":4971,"b":4980}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":5056,"b":5064}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":5077,"b":5083}]}],"statement":"WITH base_matches AS (\n    -- Base query matching friends via FTS and other search methods\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\nfiltered_matches AS (\n    -- Apply facet filters to base matches\n    SELECT bm.id\n    FROM base_matches bm\n    INNER JOIN friends.friends c ON c.id = bm.id\n    WHERE\n        -- Country filter (NULL array means no filter)\n        (:filterCountry::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_addresses a\n            WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)\n        ))\n        -- City filter\n        AND (:filterCity::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_addresses a\n            WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)\n        ))\n        -- Organization filter\n        AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))\n        -- Job title filter\n        AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))\n        -- Department filter\n        AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))\n        -- Relationship category filter\n        AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM friends.friend_relationships rel\n            INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id\n            WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n        ))\n),\nmatching_friends AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.work_notes,\n        c.created_at,\n        c.updated_at,\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            ELSE 'notes'\n        END as match_source\n    FROM filtered_matches fm\n    INNER JOIN friends.friends c ON c.id = fm.id\n    -- Re-join for match_source determination\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_friends\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE(mc.work_notes, ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_friends mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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

const getFacetCountsIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":361,"b":374},{"a":672,"b":685},{"a":781,"b":794}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":545,"b":550},{"a":942,"b":947}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":822,"b":836}]}],"statement":"WITH base_matches AS (\n    -- Base query matching friends via FTS (same as FacetedSearch)\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN friends.friend_emails e\n        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_phones p\n        ON p.friend_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN friends.friend_relationships r\n        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN friends.friend_met_info m\n        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_addresses a ON a.friend_id = bm.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_addresses a ON a.friend_id = bm.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet\nSELECT\n    'organization' as facet_field,\n    c.organization as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN friends.friends c ON c.id = bm.id\nWHERE c.organization IS NOT NULL\nGROUP BY c.organization\n\nUNION ALL\n\n-- Job title facet\nSELECT\n    'job_title' as facet_field,\n    c.job_title as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN friends.friends c ON c.id = bm.id\nWHERE c.job_title IS NOT NULL\nGROUP BY c.job_title\n\nUNION ALL\n\n-- Department facet\nSELECT\n    'department' as facet_field,\n    c.department as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN friends.friends c ON c.id = bm.id\nWHERE c.department IS NOT NULL\nGROUP BY c.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN friends.friend_relationships r ON r.friend_id = bm.id\nINNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

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

const filterOnlyListIR: any = {"usedParamSet":{"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":215}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":312,"b":325},{"a":461,"b":474}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":518,"b":528},{"a":661,"b":671}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":723,"b":741},{"a":783,"b":801}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":842,"b":856},{"a":895,"b":909}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":951,"b":967},{"a":1007,"b":1023}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":1076,"b":1102},{"a":1335,"b":1361}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":2019,"b":2025},{"a":2114,"b":2120},{"a":2211,"b":2217},{"a":2304,"b":2310},{"a":2395,"b":2401},{"a":2488,"b":2494}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":2048,"b":2057},{"a":2143,"b":2152},{"a":2238,"b":2247},{"a":2331,"b":2340},{"a":2422,"b":2431},{"a":2515,"b":2524}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":2598,"b":2606}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":2619,"b":2625}]}],"statement":"-- Lists friends with filter support but no search query\nWITH filtered_friends AS (\n    SELECT c.id\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      -- Country filter (NULL array means no filter)\n      AND (:filterCountry::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_addresses a\n          WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)\n      ))\n      -- City filter\n      AND (:filterCity::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_addresses a\n          WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)\n      ))\n      -- Organization filter\n      AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))\n      -- Job title filter\n      AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))\n      -- Department filter\n      AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))\n      -- Relationship category filter\n      AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n          SELECT 1 FROM friends.friend_relationships rel\n          INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id\n          WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n      ))\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM filtered_friends\n),\nsorted_results AS (\n    SELECT\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        (SELECT e.email_address FROM friends.friend_emails e\n         WHERE e.friend_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM friends.friend_phones p\n         WHERE p.friend_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM filtered_friends fc\n    INNER JOIN friends.friends c ON c.id = fc.id\n    ORDER BY\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,\n        c.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *          WHERE p.friend_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone
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


