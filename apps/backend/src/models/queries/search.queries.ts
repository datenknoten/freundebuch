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

const fullTextSearchContactsIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"limit":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":328,"b":333},{"a":506,"b":511},{"a":1173,"b":1178},{"a":1624,"b":1629},{"a":2283,"b":2288}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":986,"b":999},{"a":1303,"b":1316},{"a":1415,"b":1428}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1456,"b":1470}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":2810,"b":2815}]}],"statement":"WITH matching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN contacts.contact_relationships r\n        ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_met_info m\n        ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on contact fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n)\nSELECT\n    mc.external_id,\n    mc.display_name,\n    mc.photo_thumbnail_url,\n    mc.organization,\n    mc.job_title,\n    mc.fts_rank as rank,\n    mc.match_source,\n    -- Generate headline/snippet for matched content\n    ts_headline(\n        'english',\n        COALESCE(mc.display_name, '') || ' ' ||\n        COALESCE(mc.organization, '') || ' ' ||\n        COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),\n        websearch_to_tsquery('english', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    -- Get primary email\n    (SELECT e.email_address FROM contacts.contact_emails e\n     WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n    -- Get primary phone\n    (SELECT p.phone_number FROM contacts.contact_phones p\n     WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM matching_contacts mc\nORDER BY mc.fts_rank DESC, mc.display_name ASC\nLIMIT :limit"};

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
 *         COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),
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

const paginatedFullTextSearchIR: any = {"usedParamSet":{"query":true,"wildcardQuery":true,"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":372,"b":377},{"a":550,"b":555},{"a":1217,"b":1222},{"a":1668,"b":1673},{"a":2317,"b":2322}]},{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":1030,"b":1043},{"a":1347,"b":1360},{"a":1459,"b":1472}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1500,"b":1514}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":2858,"b":2864},{"a":2949,"b":2955},{"a":3038,"b":3044},{"a":3134,"b":3140},{"a":3232,"b":3238},{"a":3326,"b":3332},{"a":3418,"b":3424},{"a":3512,"b":3518}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":2884,"b":2893},{"a":2975,"b":2984},{"a":3067,"b":3076},{"a":3163,"b":3172},{"a":3259,"b":3268},{"a":3353,"b":3362},{"a":3445,"b":3454},{"a":3539,"b":3548}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":3624,"b":3632}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3645,"b":3651}]}],"statement":"WITH matching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.created_at,\n        c.updated_at,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source (using joined tables for efficiency)\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    -- LEFT JOINs for efficient matching (avoids correlated subqueries)\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN contacts.contact_relationships r\n        ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_met_info m\n        ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on contact fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- OR matches from joined tables\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_contacts\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        -- Generate headline/snippet for matched content\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        -- Get primary email\n        (SELECT e.email_address FROM contacts.contact_emails e\n         WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        -- Get primary phone\n        (SELECT p.phone_number FROM contacts.contact_phones p\n         WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_contacts mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *             COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),
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

const facetedSearchIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":381},{"a":685,"b":698},{"a":797,"b":810},{"a":3251,"b":3264}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":555,"b":560},{"a":958,"b":963},{"a":2751,"b":2756},{"a":2858,"b":2863},{"a":3438,"b":3443},{"a":3885,"b":3890}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":838,"b":852}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":1329,"b":1342},{"a":1485,"b":1498}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":1548,"b":1558},{"a":1698,"b":1708}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":1766,"b":1784},{"a":1826,"b":1844}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":1889,"b":1903},{"a":1942,"b":1956}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":2002,"b":2018},{"a":2058,"b":2074}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":2131,"b":2157},{"a":2400,"b":2426}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":4368,"b":4374},{"a":4459,"b":4465},{"a":4548,"b":4554},{"a":4644,"b":4650},{"a":4742,"b":4748},{"a":4836,"b":4842},{"a":4928,"b":4934},{"a":5022,"b":5028}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":4394,"b":4403},{"a":4485,"b":4494},{"a":4577,"b":4586},{"a":4673,"b":4682},{"a":4769,"b":4778},{"a":4863,"b":4872},{"a":4955,"b":4964},{"a":5049,"b":5058}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":5134,"b":5142}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":5155,"b":5161}]}],"statement":"WITH base_matches AS (\n    -- Base query matching contacts via FTS and other search methods\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    LEFT JOIN contacts.contact_relationships r\n        ON r.contact_id = c.id AND r.notes ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_met_info m\n        ON m.contact_id = c.id AND m.met_context ILIKE :wildcardQuery\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n          OR r.id IS NOT NULL\n          OR m.id IS NOT NULL\n      )\n),\nfiltered_matches AS (\n    -- Apply facet filters to base matches\n    SELECT bm.id\n    FROM base_matches bm\n    INNER JOIN contacts.contacts c ON c.id = bm.id\n    WHERE\n        -- Country filter (NULL array means no filter)\n        (:filterCountry::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_addresses a\n            WHERE a.contact_id = c.id AND a.country = ANY(:filterCountry)\n        ))\n        -- City filter\n        AND (:filterCity::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_addresses a\n            WHERE a.contact_id = c.id AND a.city = ANY(:filterCity)\n        ))\n        -- Organization filter\n        AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))\n        -- Job title filter\n        AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))\n        -- Department filter\n        AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))\n        -- Relationship category filter\n        AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_relationships rel\n            INNER JOIN contacts.relationship_types rt ON rel.relationship_type_id = rt.id\n            WHERE rel.contact_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n        ))\n),\nmatching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.created_at,\n        c.updated_at,\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN e.id IS NOT NULL THEN 'email'\n            WHEN p.id IS NOT NULL THEN 'phone'\n            ELSE 'notes'\n        END as match_source\n    FROM filtered_matches fm\n    INNER JOIN contacts.contacts c ON c.id = fm.id\n    -- Re-join for match_source determination\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_contacts\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        (SELECT e.email_address FROM contacts.contact_emails e\n         WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM contacts.contact_phones p\n         WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_contacts mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *             COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),
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

const getFacetCountsIR: any = {"usedParamSet":{"wildcardQuery":true,"query":true,"userExternalId":true},"params":[{"name":"wildcardQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":367,"b":380}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":554,"b":559},{"a":734,"b":739}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":614,"b":628}]}],"statement":"WITH base_matches AS (\n    -- Base query matching contacts via FTS (same as FacetedSearch)\n    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)\n    SELECT DISTINCT c.id\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    LEFT JOIN contacts.contact_emails e\n        ON e.contact_id = c.id AND e.email_address ILIKE :wildcardQuery\n    LEFT JOIN contacts.contact_phones p\n        ON p.contact_id = c.id\n        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          OR e.id IS NOT NULL\n          OR p.id IS NOT NULL\n      )\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_addresses a ON a.contact_id = bm.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_addresses a ON a.contact_id = bm.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet\nSELECT\n    'organization' as facet_field,\n    c.organization as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.organization IS NOT NULL\nGROUP BY c.organization\n\nUNION ALL\n\n-- Job title facet\nSELECT\n    'job_title' as facet_field,\n    c.job_title as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.job_title IS NOT NULL\nGROUP BY c.job_title\n\nUNION ALL\n\n-- Department facet\nSELECT\n    'department' as facet_field,\n    c.department as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.department IS NOT NULL\nGROUP BY c.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_relationships r ON r.contact_id = bm.id\nINNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

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
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           OR e.id IS NOT NULL
 *           OR p.id IS NOT NULL
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


