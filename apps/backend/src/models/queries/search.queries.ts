/** Types generated for queries found in "src/models/queries/search.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

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

const facetedSearchIR: any = {"usedParamSet":{"userExternalId":true,"query":true,"filterCountry":true,"filterCity":true,"filterOrganization":true,"filterJobTitle":true,"filterDepartment":true,"filterRelationshipCategory":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":220,"b":234}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":340,"b":345},{"a":511,"b":516},{"a":766,"b":771},{"a":974,"b":979},{"a":1163,"b":1168},{"a":2848,"b":2853},{"a":2955,"b":2960},{"a":3102,"b":3107},{"a":3302,"b":3307},{"a":3896,"b":3901}]},{"name":"filterCountry","required":false,"transform":{"type":"scalar"},"locs":[{"a":1432,"b":1445},{"a":1588,"b":1601}]},{"name":"filterCity","required":false,"transform":{"type":"scalar"},"locs":[{"a":1651,"b":1661},{"a":1801,"b":1811}]},{"name":"filterOrganization","required":false,"transform":{"type":"scalar"},"locs":[{"a":1869,"b":1887},{"a":1929,"b":1947}]},{"name":"filterJobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":1992,"b":2006},{"a":2045,"b":2059}]},{"name":"filterDepartment","required":false,"transform":{"type":"scalar"},"locs":[{"a":2105,"b":2121},{"a":2161,"b":2177}]},{"name":"filterRelationshipCategory","required":false,"transform":{"type":"scalar"},"locs":[{"a":2234,"b":2260},{"a":2497,"b":2523}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":4379,"b":4385},{"a":4470,"b":4476},{"a":4559,"b":4565},{"a":4655,"b":4661},{"a":4753,"b":4759},{"a":4847,"b":4853},{"a":4939,"b":4945},{"a":5033,"b":5039}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":4405,"b":4414},{"a":4496,"b":4505},{"a":4588,"b":4597},{"a":4684,"b":4693},{"a":4780,"b":4789},{"a":4874,"b":4883},{"a":4966,"b":4975},{"a":5060,"b":5069}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":5145,"b":5153}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":5166,"b":5172}]}],"statement":"WITH base_matches AS (\n    -- Base query matching contacts via FTS and other search methods\n    SELECT DISTINCT c.id\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_emails e\n              WHERE e.contact_id = c.id\n              AND e.email_address ILIKE '%' || :query || '%'\n          )\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_phones p\n              WHERE p.contact_id = c.id\n              AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n                  LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n          )\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_relationships r\n              WHERE r.contact_id = c.id\n              AND r.notes ILIKE '%' || :query || '%'\n          )\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_met_info m\n              WHERE m.contact_id = c.id\n              AND m.met_context ILIKE '%' || :query || '%'\n          )\n      )\n),\nfiltered_matches AS (\n    -- Apply facet filters to base matches\n    SELECT bm.id\n    FROM base_matches bm\n    INNER JOIN contacts.contacts c ON c.id = bm.id\n    WHERE\n        -- Country filter (NULL array means no filter)\n        (:filterCountry::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_addresses a\n            WHERE a.contact_id = c.id AND a.country = ANY(:filterCountry)\n        ))\n        -- City filter\n        AND (:filterCity::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_addresses a\n            WHERE a.contact_id = c.id AND a.city = ANY(:filterCity)\n        ))\n        -- Organization filter\n        AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))\n        -- Job title filter\n        AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))\n        -- Department filter\n        AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))\n        -- Relationship category filter\n        AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (\n            SELECT 1 FROM contacts.contact_relationships r\n            INNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id\n            WHERE r.contact_id = c.id AND rt.category = ANY(:filterRelationshipCategory)\n        ))\n),\nmatching_contacts AS (\n    SELECT DISTINCT ON (c.id)\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.organization,\n        c.job_title,\n        c.created_at,\n        c.updated_at,\n        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,\n        CASE\n            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'\n            WHEN EXISTS (SELECT 1 FROM contacts.contact_emails e WHERE e.contact_id = c.id AND e.email_address ILIKE '%' || :query || '%') THEN 'email'\n            WHEN EXISTS (SELECT 1 FROM contacts.contact_phones p WHERE p.contact_id = c.id AND regexp_replace(p.phone_number, '[^0-9]', '', 'g') LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%') THEN 'phone'\n            ELSE 'notes'\n        END as match_source\n    FROM filtered_matches fm\n    INNER JOIN contacts.contacts c ON c.id = fm.id\n),\ntotal_count AS (\n    SELECT COUNT(*)::int as count FROM matching_contacts\n),\nsorted_results AS (\n    SELECT\n        mc.*,\n        ts_headline(\n            'english',\n            COALESCE(mc.display_name, '') || ' ' ||\n            COALESCE(mc.organization, '') || ' ' ||\n            COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),\n            websearch_to_tsquery('english', :query),\n            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'\n        ) as headline,\n        (SELECT e.email_address FROM contacts.contact_emails e\n         WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,\n        (SELECT p.phone_number FROM contacts.contact_phones p\n         WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone\n    FROM matching_contacts mc\n    ORDER BY\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,\n        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,\n        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,\n        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,\n        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,\n        mc.display_name ASC\n    LIMIT :pageSize\n    OFFSET :offset\n)\nSELECT\n    sr.external_id,\n    sr.display_name,\n    sr.photo_thumbnail_url,\n    sr.organization,\n    sr.job_title,\n    sr.fts_rank as rank,\n    sr.match_source,\n    sr.headline,\n    sr.primary_email,\n    sr.primary_phone,\n    tc.count as total_count\nFROM sorted_results sr\nCROSS JOIN total_count tc"};

/**
 * Query generated from SQL:
 * ```
 * WITH base_matches AS (
 *     -- Base query matching contacts via FTS and other search methods
 *     SELECT DISTINCT c.id
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_emails e
 *               WHERE e.contact_id = c.id
 *               AND e.email_address ILIKE '%' || :query || '%'
 *           )
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_phones p
 *               WHERE p.contact_id = c.id
 *               AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *                   LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *           )
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_relationships r
 *               WHERE r.contact_id = c.id
 *               AND r.notes ILIKE '%' || :query || '%'
 *           )
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_met_info m
 *               WHERE m.contact_id = c.id
 *               AND m.met_context ILIKE '%' || :query || '%'
 *           )
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
 *             SELECT 1 FROM contacts.contact_relationships r
 *             INNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id
 *             WHERE r.contact_id = c.id AND rt.category = ANY(:filterRelationshipCategory)
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
 *             WHEN EXISTS (SELECT 1 FROM contacts.contact_emails e WHERE e.contact_id = c.id AND e.email_address ILIKE '%' || :query || '%') THEN 'email'
 *             WHEN EXISTS (SELECT 1 FROM contacts.contact_phones p WHERE p.contact_id = c.id AND regexp_replace(p.phone_number, '[^0-9]', '', 'g') LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%') THEN 'phone'
 *             ELSE 'notes'
 *         END as match_source
 *     FROM filtered_matches fm
 *     INNER JOIN contacts.contacts c ON c.id = fm.id
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

const getFacetCountsIR: any = {"usedParamSet":{"userExternalId":true,"query":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":210,"b":224}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":330,"b":335},{"a":501,"b":506},{"a":756,"b":761}]}],"statement":"WITH base_matches AS (\n    -- Base query matching contacts via FTS (same as FacetedSearch)\n    SELECT c.id\n    FROM contacts.contacts c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n      AND (\n          c.search_vector @@ websearch_to_tsquery('english', :query)\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_emails e\n              WHERE e.contact_id = c.id\n              AND e.email_address ILIKE '%' || :query || '%'\n          )\n          OR EXISTS (\n              SELECT 1 FROM contacts.contact_phones p\n              WHERE p.contact_id = c.id\n              AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')\n                  LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'\n          )\n      )\n)\n-- Country facet\nSELECT\n    'country' as facet_field,\n    a.country as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_addresses a ON a.contact_id = bm.id\nWHERE a.country IS NOT NULL\nGROUP BY a.country\n\nUNION ALL\n\n-- City facet\nSELECT\n    'city' as facet_field,\n    a.city as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_addresses a ON a.contact_id = bm.id\nWHERE a.city IS NOT NULL\nGROUP BY a.city\n\nUNION ALL\n\n-- Organization facet\nSELECT\n    'organization' as facet_field,\n    c.organization as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.organization IS NOT NULL\nGROUP BY c.organization\n\nUNION ALL\n\n-- Job title facet\nSELECT\n    'job_title' as facet_field,\n    c.job_title as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.job_title IS NOT NULL\nGROUP BY c.job_title\n\nUNION ALL\n\n-- Department facet\nSELECT\n    'department' as facet_field,\n    c.department as facet_value,\n    COUNT(*)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contacts c ON c.id = bm.id\nWHERE c.department IS NOT NULL\nGROUP BY c.department\n\nUNION ALL\n\n-- Relationship category facet\nSELECT\n    'relationship_category' as facet_field,\n    rt.category as facet_value,\n    COUNT(DISTINCT bm.id)::int as count\nFROM base_matches bm\nINNER JOIN contacts.contact_relationships r ON r.contact_id = bm.id\nINNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id\nGROUP BY rt.category\n\nORDER BY facet_field, count DESC, facet_value"};

/**
 * Query generated from SQL:
 * ```
 * WITH base_matches AS (
 *     -- Base query matching contacts via FTS (same as FacetedSearch)
 *     SELECT c.id
 *     FROM contacts.contacts c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 *       AND (
 *           c.search_vector @@ websearch_to_tsquery('english', :query)
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_emails e
 *               WHERE e.contact_id = c.id
 *               AND e.email_address ILIKE '%' || :query || '%'
 *           )
 *           OR EXISTS (
 *               SELECT 1 FROM contacts.contact_phones p
 *               WHERE p.contact_id = c.id
 *               AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
 *                   LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
 *           )
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


