/** Types generated for queries found in "src/models/queries/search.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'FullTextSearchContacts' parameters type */
export interface IFullTextSearchContactsParams {
  limit?: NumberOrString | null | void;
  query?: string | null | void;
  userExternalId?: string | null | void;
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

const fullTextSearchContactsIR: any = {"usedParamSet":{"query":true,"userExternalId":true,"limit":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":328,"b":333},{"a":469,"b":474},{"a":665,"b":670},{"a":947,"b":952},{"a":1180,"b":1185},{"a":1394,"b":1399},{"a":1756,"b":1761},{"a":1976,"b":1981},{"a":2292,"b":2297},{"a":2544,"b":2549},{"a":2770,"b":2775},{"a":3284,"b":3289}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1588,"b":1602}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":3811,"b":3816}]}],"statement":"WITH matching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN EXISTS (\n                SELECT 1 FROM contacts.contact_emails e\n                WHERE e.contact_id = c.id\n                AND e.email_address ILIKE '%' || :query || '%'\n            ) THEN 'email'\n            WHEN EXISTS (\n                SELECT 1 FROM contacts.contact_phones p\n                WHERE p.contact_id = c.id\n                AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n                    LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n            ) THEN 'phone'\n            WHEN EXISTS (\n                SELECT 1 FROM contacts.contact_relationships r\n                WHERE r.contact_id = c.id\n                AND r.notes ILIKE '%' || :query || '%'\n            ) THEN 'notes'\n            WHEN EXISTS (\n                SELECT 1 FROM contacts.contact_met_info m\n                WHERE m.contact_id = c.id\n                AND m.met_context ILIKE '%' || :query || '%'\n            ) THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on contact fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- OR partial match on email addresses\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_emails e\n              WHERE e.contact_id = c.id\n              AND e.email_address ILIKE '%' || :query || '%'\n          )\n          -- OR partial match on phone numbers (digits only)\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_phones p\n              WHERE p.contact_id = c.id\n              AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n                  LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n          )\n          -- OR match on relationship notes\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_relationships r\n              WHERE r.contact_id = c.id\n              AND r.notes ILIKE '%' || :query || '%'\n          )\n          -- OR match on met_context\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_met_info m\n              WHERE m.contact_id = c.id\n              AND m.met_context ILIKE '%' || :query || '%'\n          )\n      )\n)\nSELECT\n    mc.external_id,\n    mc.display_name,\n    mc.photo_thumbnail_url,\n    mc.organization,\n    mc.job_title,\n    mc.fts_rank as rank,\n    mc.match_source,\n    -- Generate headline/snippet for matched content\n    ts_headline(\n        'english',\n        COALESCE(mc.display_name, '') || ' ' ||\n        COALESCE(mc.organization, '') || ' ' ||\n        COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),\n        websearch_to_tsquery('english', :query),\n        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n    ) as headline,\n    -- Get primary email\n    (SELECT e.email_address FROM contacts.contact_emails e\n     WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n    -- Get primary phone\n    (SELECT p.phone_number FROM contacts.contact_phones p\n     WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM matching_contacts mc\nORDER BY mc.fts_rank DESC, mc.display_name ASC\nLIMIT :limit"};

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
 *         -- Determine match source
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'
 *             WHEN EXISTS (
 *                 SELECT 1 FROM contacts.contact_emails e
 *                 WHERE e.contact_id = c.id
 *                 AND e.email_address ILIKE '%' || :query || '%'
 *             ) THEN 'email'
 *             WHEN EXISTS (
 *                 SELECT 1 FROM contacts.contact_phones p
 *                 WHERE p.contact_id = c.id
 *                 AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *                     LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *             ) THEN 'phone'
 *             WHEN EXISTS (
 *                 SELECT 1 FROM contacts.contact_relationships r
 *                 WHERE r.contact_id = c.id
 *                 AND r.notes ILIKE '%' || :query || '%'
 *             ) THEN 'notes'
 *             WHEN EXISTS (
 *                 SELECT 1 FROM contacts.contact_met_info m
 *                 WHERE m.contact_id = c.id
 *                 AND m.met_context ILIKE '%' || :query || '%'
 *             ) THEN 'notes'
 *             ELSE NULL
 *         END as match_source
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           -- Full-text search on contact fields
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           -- OR partial match on email addresses
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_emails e
 *               WHERE e.contact_id = c.id
 *               AND e.email_address ILIKE '%' || :query || '%'
 *           )
 *           -- OR partial match on phone numbers (digits only)
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_phones p
 *               WHERE p.contact_id = c.id
 *               AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *                   LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *           )
 *           -- OR match on relationship notes
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_relationships r
 *               WHERE r.contact_id = c.id
 *               AND r.notes ILIKE '%' || :query || '%'
 *           )
 *           -- OR match on met_context
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_met_info m
 *               WHERE m.contact_id = c.id
 *               AND m.met_context ILIKE '%' || :query || '%'
 *           )
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

const paginatedFullTextSearchIR: any = {"usedParamSet":{"query":true,"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":372,"b":377},{"a":513,"b":518},{"a":709,"b":714},{"a":991,"b":996},{"a":1224,"b":1229},{"a":1438,"b":1443},{"a":1800,"b":1805},{"a":2020,"b":2025},{"a":2336,"b":2341},{"a":2588,"b":2593},{"a":2814,"b":2819},{"a":3318,"b":3323}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1632,"b":1646}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":3859,"b":3865},{"a":3950,"b":3956},{"a":4039,"b":4045},{"a":4135,"b":4141},{"a":4233,"b":4239},{"a":4327,"b":4333},{"a":4419,"b":4425},{"a":4513,"b":4519}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":3885,"b":3894},{"a":3976,"b":3985},{"a":4068,"b":4077},{"a":4164,"b":4173},{"a":4260,"b":4269},{"a":4354,"b":4363},{"a":4446,"b":4455},{"a":4540,"b":4549}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":4625,"b":4633}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":4646,"b":4652}]}],"statement":"WITH matching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.created_at,\n        c.updated_at,\n        -- Calculate relevance score from full-text search\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        -- Determine match source\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN EXISTS (\n                SELECT 1 FROM contacts.contact_emails e\n                WHERE e.contact_id = c.id\n                AND e.email_address ILIKE '%' || :query || '%'\n            ) THEN 'email'\n            WHEN EXISTS (\n                SELECT 1 FROM contacts.contact_phones p\n                WHERE p.contact_id = c.id\n                AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n                    LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n            ) THEN 'phone'\n            WHEN EXISTS (\n                SELECT 1 FROM contacts.contact_relationships r\n                WHERE r.contact_id = c.id\n                AND r.notes ILIKE '%' || :query || '%'\n            ) THEN 'notes'\n            WHEN EXISTS (\n                SELECT 1 FROM contacts.contact_met_info m\n                WHERE m.contact_id = c.id\n                AND m.met_context ILIKE '%' || :query || '%'\n            ) THEN 'notes'\n            ELSE NULL\n        END as match_source\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          -- Full-text search on contact fields\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          -- OR partial match on email addresses\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_emails e\n              WHERE e.contact_id = c.id\n              AND e.email_address ILIKE '%' || :query || '%'\n          )\n          -- OR partial match on phone numbers (digits only)\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_phones p\n              WHERE p.contact_id = c.id\n              AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n                  LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n          )\n          -- OR match on relationship notes\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_relationships r\n              WHERE r.contact_id = c.id\n              AND r.notes ILIKE '%' || :query || '%'\n          )\n          -- OR match on met_context\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_met_info m\n              WHERE m.contact_id = c.id\n              AND m.met_context ILIKE '%' || :query || '%'\n          )\n      )\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_contacts\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        -- Generate headline/snippet for matched content\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        -- Get primary email\n        (SELECT e.email_address FROM contacts.contact_emails e\n         WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        -- Get primary phone\n        (SELECT p.phone_number FROM contacts.contact_phones p\n         WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_contacts mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

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
 *         -- Determine match source
 *         CASE
 *             WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'
 *             WHEN EXISTS (
 *                 SELECT 1 FROM contacts.contact_emails e
 *                 WHERE e.contact_id = c.id
 *                 AND e.email_address ILIKE '%' || :query || '%'
 *             ) THEN 'email'
 *             WHEN EXISTS (
 *                 SELECT 1 FROM contacts.contact_phones p
 *                 WHERE p.contact_id = c.id
 *                 AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *                     LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *             ) THEN 'phone'
 *             WHEN EXISTS (
 *                 SELECT 1 FROM contacts.contact_relationships r
 *                 WHERE r.contact_id = c.id
 *                 AND r.notes ILIKE '%' || :query || '%'
 *             ) THEN 'notes'
 *             WHEN EXISTS (
 *                 SELECT 1 FROM contacts.contact_met_info m
 *                 WHERE m.contact_id = c.id
 *                 AND m.met_context ILIKE '%' || :query || '%'
 *             ) THEN 'notes'
 *             ELSE NULL
 *         END as match_source
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           -- Full-text search on contact fields
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           -- OR partial match on email addresses
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_emails e
 *               WHERE e.contact_id = c.id
 *               AND e.email_address ILIKE '%' || :query || '%'
 *           )
 *           -- OR partial match on phone numbers (digits only)
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_phones p
 *               WHERE p.contact_id = c.id
 *               AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *                   LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *           )
 *           -- OR match on relationship notes
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_relationships r
 *               WHERE r.contact_id = c.id
 *               AND r.notes ILIKE '%' || :query || '%'
 *           )
 *           -- OR match on met_context
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_met_info m
 *               WHERE m.contact_id = c.id
 *               AND m.met_context ILIKE '%' || :query || '%'
 *           )
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


