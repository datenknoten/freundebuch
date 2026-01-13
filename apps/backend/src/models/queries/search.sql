/*
 * Epic 10: Search Functionality
 * Full-text search queries and search history management
 */

/* @name FullTextSearchFriends */
WITH matching_friends AS (
    SELECT DISTINCT ON (c.id)
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.organization,
        c.job_title,
        c.work_notes,
        -- Calculate relevance score from full-text search
        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
        -- Determine match source (using joined tables for efficiency)
        CASE
            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'
            WHEN e.id IS NOT NULL THEN 'email'
            WHEN p.id IS NOT NULL THEN 'phone'
            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'
            ELSE NULL
        END as match_source
    FROM friends.friends c
    INNER JOIN auth.users u ON c.user_id = u.id
    -- LEFT JOINs for efficient matching (avoids correlated subqueries)
    LEFT JOIN friends.friend_emails e
        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
    LEFT JOIN friends.friend_phones p
        ON p.friend_id = c.id
        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
    LEFT JOIN friends.friend_relationships r
        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
    LEFT JOIN friends.friend_met_info m
        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
      AND (
          -- Full-text search on friend fields
          c.search_vector @@ websearch_to_tsquery('english', :query)
          -- OR matches from joined tables
          OR e.id IS NOT NULL
          OR p.id IS NOT NULL
          OR r.id IS NOT NULL
          OR m.id IS NOT NULL
      )
)
SELECT
    mc.external_id,
    mc.display_name,
    mc.photo_thumbnail_url,
    mc.organization,
    mc.job_title,
    mc.fts_rank as rank,
    mc.match_source,
    -- Generate headline/snippet for matched content
    ts_headline(
        'english',
        COALESCE(mc.display_name, '') || ' ' ||
        COALESCE(mc.organization, '') || ' ' ||
        COALESCE(mc.work_notes, ''),
        websearch_to_tsquery('english', :query),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
    ) as headline,
    -- Get primary email
    (SELECT e.email_address FROM friends.friend_emails e
     WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
    -- Get primary phone
    (SELECT p.phone_number FROM friends.friend_phones p
     WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
FROM matching_friends mc
ORDER BY mc.fts_rank DESC, mc.display_name ASC
LIMIT :limit;


/* @name PaginatedFullTextSearch */
WITH matching_friends AS (
    SELECT DISTINCT ON (c.id)
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.organization,
        c.job_title,
        c.work_notes,
        c.created_at,
        c.updated_at,
        -- Calculate relevance score from full-text search
        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
        -- Determine match source (using joined tables for efficiency)
        CASE
            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'
            WHEN e.id IS NOT NULL THEN 'email'
            WHEN p.id IS NOT NULL THEN 'phone'
            WHEN r.id IS NOT NULL OR m.id IS NOT NULL THEN 'notes'
            ELSE NULL
        END as match_source
    FROM friends.friends c
    INNER JOIN auth.users u ON c.user_id = u.id
    -- LEFT JOINs for efficient matching (avoids correlated subqueries)
    LEFT JOIN friends.friend_emails e
        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
    LEFT JOIN friends.friend_phones p
        ON p.friend_id = c.id
        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
    LEFT JOIN friends.friend_relationships r
        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
    LEFT JOIN friends.friend_met_info m
        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
      AND (
          -- Full-text search on friend fields
          c.search_vector @@ websearch_to_tsquery('english', :query)
          -- OR matches from joined tables
          OR e.id IS NOT NULL
          OR p.id IS NOT NULL
          OR r.id IS NOT NULL
          OR m.id IS NOT NULL
      )
),
total_count AS (
    SELECT COUNT(*)::int as count FROM matching_friends
),
sorted_results AS (
    SELECT
        mc.*,
        -- Generate headline/snippet for matched content
        ts_headline(
            'english',
            COALESCE(mc.display_name, '') || ' ' ||
            COALESCE(mc.organization, '') || ' ' ||
            COALESCE(mc.work_notes, ''),
            websearch_to_tsquery('english', :query),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
        ) as headline,
        -- Get primary email
        (SELECT e.email_address FROM friends.friend_emails e
         WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
        -- Get primary phone
        (SELECT p.phone_number FROM friends.friend_phones p
         WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
    FROM matching_friends mc
    ORDER BY
        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,
        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,
        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,
        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,
        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,
        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,
        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,
        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,
        mc.display_name ASC
    LIMIT :pageSize
    OFFSET :offset
)
SELECT
    sr.external_id,
    sr.display_name,
    sr.photo_thumbnail_url,
    sr.organization,
    sr.job_title,
    sr.fts_rank as rank,
    sr.match_source,
    sr.headline,
    sr.primary_email,
    sr.primary_phone,
    tc.count as total_count
FROM sorted_results sr
CROSS JOIN total_count tc;


/* @name GetRecentSearches */
SELECT sh.query, sh.searched_at
FROM friends.search_history sh
INNER JOIN auth.users u ON sh.user_id = u.id
WHERE u.external_id = :userExternalId
ORDER BY sh.searched_at DESC
LIMIT :limit;


/* @name AddRecentSearch */
INSERT INTO friends.search_history (user_id, query, searched_at)
SELECT u.id, :query, CURRENT_TIMESTAMP
FROM auth.users u
WHERE u.external_id = :userExternalId
ON CONFLICT (user_id, query)
DO UPDATE SET searched_at = CURRENT_TIMESTAMP
RETURNING id, query, searched_at;


/* @name DeleteRecentSearch */
DELETE FROM friends.search_history sh
USING auth.users u
WHERE sh.user_id = u.id
  AND u.external_id = :userExternalId
  AND sh.query = :query
RETURNING sh.id;


/* @name ClearRecentSearches */
DELETE FROM friends.search_history sh
USING auth.users u
WHERE sh.user_id = u.id
  AND u.external_id = :userExternalId
RETURNING sh.id;


/* @name FacetedSearch */
WITH base_matches AS (
    -- Base query matching friends via FTS and other search methods
    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)
    SELECT DISTINCT c.id
    FROM friends.friends c
    INNER JOIN auth.users u ON c.user_id = u.id
    LEFT JOIN friends.friend_emails e
        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
    LEFT JOIN friends.friend_phones p
        ON p.friend_id = c.id
        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
    LEFT JOIN friends.friend_relationships r
        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
    LEFT JOIN friends.friend_met_info m
        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
      AND (
          c.search_vector @@ websearch_to_tsquery('english', :query)
          OR e.id IS NOT NULL
          OR p.id IS NOT NULL
          OR r.id IS NOT NULL
          OR m.id IS NOT NULL
      )
),
filtered_matches AS (
    -- Apply facet filters to base matches
    SELECT bm.id
    FROM base_matches bm
    INNER JOIN friends.friends c ON c.id = bm.id
    WHERE
        -- Country filter (NULL array means no filter)
        (:filterCountry::text[] IS NULL OR EXISTS (
            SELECT 1 FROM friends.friend_addresses a
            WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)
        ))
        -- City filter
        AND (:filterCity::text[] IS NULL OR EXISTS (
            SELECT 1 FROM friends.friend_addresses a
            WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)
        ))
        -- Organization filter
        AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))
        -- Job title filter
        AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))
        -- Department filter
        AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))
        -- Relationship category filter
        AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (
            SELECT 1 FROM friends.friend_relationships rel
            INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id
            WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)
        ))
        -- Circles filter: supports circle IDs and 'no-circle' for friends without circles
        AND (:filterCircles::text[] IS NULL OR (
            -- Check for 'no-circle' filter
            ('no-circle' = ANY(:filterCircles) AND NOT EXISTS (
                SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id
            ))
            OR
            -- Check for specific circle IDs (filter out 'no-circle' from array)
            EXISTS (
                SELECT 1 FROM friends.friend_circles fc
                INNER JOIN friends.circles cir ON fc.circle_id = cir.id
                WHERE fc.friend_id = c.id
                  AND cir.external_id = ANY(array_remove(:filterCircles, 'no-circle')::uuid[])
            )
        ))
),
matching_friends AS (
    SELECT DISTINCT ON (c.id)
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.organization,
        c.job_title,
        c.work_notes,
        c.created_at,
        c.updated_at,
        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
        CASE
            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'friend'
            WHEN e.id IS NOT NULL THEN 'email'
            WHEN p.id IS NOT NULL THEN 'phone'
            ELSE 'notes'
        END as match_source
    FROM filtered_matches fm
    INNER JOIN friends.friends c ON c.id = fm.id
    -- Re-join for match_source determination
    LEFT JOIN friends.friend_emails e
        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
    LEFT JOIN friends.friend_phones p
        ON p.friend_id = c.id
        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
),
total_count AS (
    SELECT COUNT(*)::int as count FROM matching_friends
),
sorted_results AS (
    SELECT
        mc.*,
        ts_headline(
            'english',
            COALESCE(mc.display_name, '') || ' ' ||
            COALESCE(mc.organization, '') || ' ' ||
            COALESCE(mc.work_notes, ''),
            websearch_to_tsquery('english', :query),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
        ) as headline,
        (SELECT e.email_address FROM friends.friend_emails e
         WHERE e.friend_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
        (SELECT p.phone_number FROM friends.friend_phones p
         WHERE p.friend_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
    FROM matching_friends mc
    ORDER BY
        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'desc' THEN mc.fts_rank END DESC,
        CASE WHEN :sortBy = 'relevance' AND :sortOrder = 'asc' THEN mc.fts_rank END ASC,
        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN mc.display_name END ASC,
        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN mc.display_name END DESC,
        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN mc.created_at END DESC,
        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN mc.created_at END ASC,
        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN mc.updated_at END DESC,
        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN mc.updated_at END ASC,
        mc.display_name ASC
    LIMIT :pageSize
    OFFSET :offset
)
SELECT
    sr.external_id,
    sr.display_name,
    sr.photo_thumbnail_url,
    sr.organization,
    sr.job_title,
    sr.fts_rank as rank,
    sr.match_source,
    sr.headline,
    sr.primary_email,
    sr.primary_phone,
    tc.count as total_count
FROM sorted_results sr
CROSS JOIN total_count tc;


/* @name GetFacetCounts */
WITH base_matches AS (
    -- Base query matching friends via FTS (same as FacetedSearch)
    -- Uses LEFT JOINs for efficient matching (avoids correlated subqueries)
    SELECT DISTINCT c.id
    FROM friends.friends c
    INNER JOIN auth.users u ON c.user_id = u.id
    LEFT JOIN friends.friend_emails e
        ON e.friend_id = c.id AND e.email_address ILIKE :wildcardQuery
    LEFT JOIN friends.friend_phones p
        ON p.friend_id = c.id
        AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
            LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
    LEFT JOIN friends.friend_relationships r
        ON r.friend_id = c.id AND r.notes ILIKE :wildcardQuery
    LEFT JOIN friends.friend_met_info m
        ON m.friend_id = c.id AND m.met_context ILIKE :wildcardQuery
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
      AND (
          c.search_vector @@ websearch_to_tsquery('english', :query)
          OR e.id IS NOT NULL
          OR p.id IS NOT NULL
          OR r.id IS NOT NULL
          OR m.id IS NOT NULL
      )
)
-- Country facet
SELECT
    'country' as facet_field,
    a.country as facet_value,
    COUNT(DISTINCT bm.id)::int as count
FROM base_matches bm
INNER JOIN friends.friend_addresses a ON a.friend_id = bm.id
WHERE a.country IS NOT NULL
GROUP BY a.country

UNION ALL

-- City facet
SELECT
    'city' as facet_field,
    a.city as facet_value,
    COUNT(DISTINCT bm.id)::int as count
FROM base_matches bm
INNER JOIN friends.friend_addresses a ON a.friend_id = bm.id
WHERE a.city IS NOT NULL
GROUP BY a.city

UNION ALL

-- Organization facet
SELECT
    'organization' as facet_field,
    c.organization as facet_value,
    COUNT(*)::int as count
FROM base_matches bm
INNER JOIN friends.friends c ON c.id = bm.id
WHERE c.organization IS NOT NULL
GROUP BY c.organization

UNION ALL

-- Job title facet
SELECT
    'job_title' as facet_field,
    c.job_title as facet_value,
    COUNT(*)::int as count
FROM base_matches bm
INNER JOIN friends.friends c ON c.id = bm.id
WHERE c.job_title IS NOT NULL
GROUP BY c.job_title

UNION ALL

-- Department facet
SELECT
    'department' as facet_field,
    c.department as facet_value,
    COUNT(*)::int as count
FROM base_matches bm
INNER JOIN friends.friends c ON c.id = bm.id
WHERE c.department IS NOT NULL
GROUP BY c.department

UNION ALL

-- Relationship category facet
SELECT
    'relationship_category' as facet_field,
    rt.category as facet_value,
    COUNT(DISTINCT bm.id)::int as count
FROM base_matches bm
INNER JOIN friends.friend_relationships r ON r.friend_id = bm.id
INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
GROUP BY rt.category

ORDER BY facet_field, count DESC, facet_value;


/* @name FilterOnlyList */
-- Lists friends with filter support but no search query
WITH filtered_friends AS (
    SELECT c.id
    FROM friends.friends c
    INNER JOIN auth.users u ON c.user_id = u.id
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
      -- Country filter (NULL array means no filter)
      AND (:filterCountry::text[] IS NULL OR EXISTS (
          SELECT 1 FROM friends.friend_addresses a
          WHERE a.friend_id = c.id AND a.country = ANY(:filterCountry)
      ))
      -- City filter
      AND (:filterCity::text[] IS NULL OR EXISTS (
          SELECT 1 FROM friends.friend_addresses a
          WHERE a.friend_id = c.id AND a.city = ANY(:filterCity)
      ))
      -- Organization filter
      AND (:filterOrganization::text[] IS NULL OR c.organization = ANY(:filterOrganization))
      -- Job title filter
      AND (:filterJobTitle::text[] IS NULL OR c.job_title = ANY(:filterJobTitle))
      -- Department filter
      AND (:filterDepartment::text[] IS NULL OR c.department = ANY(:filterDepartment))
      -- Relationship category filter
      AND (:filterRelationshipCategory::text[] IS NULL OR EXISTS (
          SELECT 1 FROM friends.friend_relationships rel
          INNER JOIN friends.relationship_types rt ON rel.relationship_type_id = rt.id
          WHERE rel.friend_id = c.id AND rt.category = ANY(:filterRelationshipCategory)
      ))
      -- Circles filter: supports circle IDs and 'no-circle' for friends without circles
      AND (:filterCircles::text[] IS NULL OR (
          -- Check for 'no-circle' filter
          ('no-circle' = ANY(:filterCircles) AND NOT EXISTS (
              SELECT 1 FROM friends.friend_circles fc WHERE fc.friend_id = c.id
          ))
          OR
          -- Check for specific circle IDs (filter out 'no-circle' from array)
          EXISTS (
              SELECT 1 FROM friends.friend_circles fc
              INNER JOIN friends.circles cir ON fc.circle_id = cir.id
              WHERE fc.friend_id = c.id
                AND cir.external_id = ANY(array_remove(:filterCircles, 'no-circle')::uuid[])
          )
      ))
),
total_count AS (
    SELECT COUNT(*)::int as count FROM filtered_friends
),
sorted_results AS (
    SELECT
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.organization,
        c.job_title,
        (SELECT e.email_address FROM friends.friend_emails e
         WHERE e.friend_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,
        (SELECT p.phone_number FROM friends.friend_phones p
         WHERE p.friend_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone
    FROM filtered_friends fc
    INNER JOIN friends.friends c ON c.id = fc.id
    ORDER BY
        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,
        CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,
        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,
        CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,
        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC,
        CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,
        c.display_name ASC
    LIMIT :pageSize
    OFFSET :offset
)
SELECT
    sr.external_id,
    sr.display_name,
    sr.photo_thumbnail_url,
    sr.organization,
    sr.job_title,
    sr.primary_email,
    sr.primary_phone,
    tc.count as total_count
FROM sorted_results sr
CROSS JOIN total_count tc;


/* @name GetAllFacetCounts */
-- Gets facet counts for all friends (no search filter)
WITH all_friends AS (
    SELECT c.id
    FROM friends.friends c
    INNER JOIN auth.users u ON c.user_id = u.id
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
)
-- Country facet
SELECT
    'country' as facet_field,
    a.country as facet_value,
    COUNT(DISTINCT ac.id)::int as count
FROM all_friends ac
INNER JOIN friends.friend_addresses a ON a.friend_id = ac.id
WHERE a.country IS NOT NULL
GROUP BY a.country

UNION ALL

-- City facet
SELECT
    'city' as facet_field,
    a.city as facet_value,
    COUNT(DISTINCT ac.id)::int as count
FROM all_friends ac
INNER JOIN friends.friend_addresses a ON a.friend_id = ac.id
WHERE a.city IS NOT NULL
GROUP BY a.city

UNION ALL

-- Organization facet
SELECT
    'organization' as facet_field,
    c.organization as facet_value,
    COUNT(*)::int as count
FROM all_friends ac
INNER JOIN friends.friends c ON c.id = ac.id
WHERE c.organization IS NOT NULL
GROUP BY c.organization

UNION ALL

-- Job title facet
SELECT
    'job_title' as facet_field,
    c.job_title as facet_value,
    COUNT(*)::int as count
FROM all_friends ac
INNER JOIN friends.friends c ON c.id = ac.id
WHERE c.job_title IS NOT NULL
GROUP BY c.job_title

UNION ALL

-- Department facet
SELECT
    'department' as facet_field,
    c.department as facet_value,
    COUNT(*)::int as count
FROM all_friends ac
INNER JOIN friends.friends c ON c.id = ac.id
WHERE c.department IS NOT NULL
GROUP BY c.department

UNION ALL

-- Relationship category facet
SELECT
    'relationship_category' as facet_field,
    rt.category as facet_value,
    COUNT(DISTINCT ac.id)::int as count
FROM all_friends ac
INNER JOIN friends.friend_relationships r ON r.friend_id = ac.id
INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
GROUP BY rt.category

ORDER BY facet_field, count DESC, facet_value;
