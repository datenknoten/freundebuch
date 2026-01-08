/*
 * Epic 10: Search Functionality
 * Full-text search queries and search history management
 */

/* @name FullTextSearchContacts */
WITH matching_contacts AS (
    SELECT DISTINCT ON (c.id)
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.organization,
        c.job_title,
        -- Calculate relevance score from full-text search
        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
        -- Determine match source
        CASE
            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'
            WHEN EXISTS (
                SELECT 1 FROM contacts.contact_emails e
                WHERE e.contact_id = c.id
                AND e.email_address ILIKE '%' || :query || '%'
            ) THEN 'email'
            WHEN EXISTS (
                SELECT 1 FROM contacts.contact_phones p
                WHERE p.contact_id = c.id
                AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
                    LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
            ) THEN 'phone'
            WHEN EXISTS (
                SELECT 1 FROM contacts.contact_relationships r
                WHERE r.contact_id = c.id
                AND r.notes ILIKE '%' || :query || '%'
            ) THEN 'notes'
            WHEN EXISTS (
                SELECT 1 FROM contacts.contact_met_info m
                WHERE m.contact_id = c.id
                AND m.met_context ILIKE '%' || :query || '%'
            ) THEN 'notes'
            ELSE NULL
        END as match_source
    FROM contacts.contacts c
    INNER JOIN auth.users u ON c.user_id = u.id
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
      AND (
          -- Full-text search on contact fields
          c.search_vector @@ websearch_to_tsquery('english', :query)
          -- OR partial match on email addresses
          OR EXISTS (
              SELECT 1 FROM contacts.contact_emails e
              WHERE e.contact_id = c.id
              AND e.email_address ILIKE '%' || :query || '%'
          )
          -- OR partial match on phone numbers (digits only)
          OR EXISTS (
              SELECT 1 FROM contacts.contact_phones p
              WHERE p.contact_id = c.id
              AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
                  LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
          )
          -- OR match on relationship notes
          OR EXISTS (
              SELECT 1 FROM contacts.contact_relationships r
              WHERE r.contact_id = c.id
              AND r.notes ILIKE '%' || :query || '%'
          )
          -- OR match on met_context
          OR EXISTS (
              SELECT 1 FROM contacts.contact_met_info m
              WHERE m.contact_id = c.id
              AND m.met_context ILIKE '%' || :query || '%'
          )
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
        COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),
        websearch_to_tsquery('english', :query),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
    ) as headline,
    -- Get primary email
    (SELECT e.email_address FROM contacts.contact_emails e
     WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
    -- Get primary phone
    (SELECT p.phone_number FROM contacts.contact_phones p
     WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
FROM matching_contacts mc
ORDER BY mc.fts_rank DESC, mc.display_name ASC
LIMIT :limit;


/* @name PaginatedFullTextSearch */
WITH matching_contacts AS (
    SELECT DISTINCT ON (c.id)
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.organization,
        c.job_title,
        c.created_at,
        c.updated_at,
        -- Calculate relevance score from full-text search
        COALESCE(ts_rank(c.search_vector, websearch_to_tsquery('english', :query)), 0) as fts_rank,
        -- Determine match source
        CASE
            WHEN c.search_vector @@ websearch_to_tsquery('english', :query) THEN 'contact'
            WHEN EXISTS (
                SELECT 1 FROM contacts.contact_emails e
                WHERE e.contact_id = c.id
                AND e.email_address ILIKE '%' || :query || '%'
            ) THEN 'email'
            WHEN EXISTS (
                SELECT 1 FROM contacts.contact_phones p
                WHERE p.contact_id = c.id
                AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
                    LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
            ) THEN 'phone'
            WHEN EXISTS (
                SELECT 1 FROM contacts.contact_relationships r
                WHERE r.contact_id = c.id
                AND r.notes ILIKE '%' || :query || '%'
            ) THEN 'notes'
            WHEN EXISTS (
                SELECT 1 FROM contacts.contact_met_info m
                WHERE m.contact_id = c.id
                AND m.met_context ILIKE '%' || :query || '%'
            ) THEN 'notes'
            ELSE NULL
        END as match_source
    FROM contacts.contacts c
    INNER JOIN auth.users u ON c.user_id = u.id
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
      AND (
          -- Full-text search on contact fields
          c.search_vector @@ websearch_to_tsquery('english', :query)
          -- OR partial match on email addresses
          OR EXISTS (
              SELECT 1 FROM contacts.contact_emails e
              WHERE e.contact_id = c.id
              AND e.email_address ILIKE '%' || :query || '%'
          )
          -- OR partial match on phone numbers (digits only)
          OR EXISTS (
              SELECT 1 FROM contacts.contact_phones p
              WHERE p.contact_id = c.id
              AND regexp_replace(p.phone_number, '[^0-9]', '', 'g')
                  LIKE '%' || regexp_replace(:query, '[^0-9]', '', 'g') || '%'
          )
          -- OR match on relationship notes
          OR EXISTS (
              SELECT 1 FROM contacts.contact_relationships r
              WHERE r.contact_id = c.id
              AND r.notes ILIKE '%' || :query || '%'
          )
          -- OR match on met_context
          OR EXISTS (
              SELECT 1 FROM contacts.contact_met_info m
              WHERE m.contact_id = c.id
              AND m.met_context ILIKE '%' || :query || '%'
          )
      )
),
total_count AS (
    SELECT COUNT(*)::int as count FROM matching_contacts
),
sorted_results AS (
    SELECT
        mc.*,
        -- Generate headline/snippet for matched content
        ts_headline(
            'english',
            COALESCE(mc.display_name, '') || ' ' ||
            COALESCE(mc.organization, '') || ' ' ||
            COALESCE((SELECT c2.work_notes FROM contacts.contacts c2 WHERE c2.id = mc.id), ''),
            websearch_to_tsquery('english', :query),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=15, MinWords=5, HighlightAll=false'
        ) as headline,
        -- Get primary email
        (SELECT e.email_address FROM contacts.contact_emails e
         WHERE e.contact_id = mc.id AND e.is_primary = true LIMIT 1) as primary_email,
        -- Get primary phone
        (SELECT p.phone_number FROM contacts.contact_phones p
         WHERE p.contact_id = mc.id AND p.is_primary = true LIMIT 1) as primary_phone
    FROM matching_contacts mc
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
FROM contacts.search_history sh
INNER JOIN auth.users u ON sh.user_id = u.id
WHERE u.external_id = :userExternalId
ORDER BY sh.searched_at DESC
LIMIT :limit;


/* @name AddRecentSearch */
INSERT INTO contacts.search_history (user_id, query, searched_at)
SELECT u.id, :query, CURRENT_TIMESTAMP
FROM auth.users u
WHERE u.external_id = :userExternalId
ON CONFLICT (user_id, query)
DO UPDATE SET searched_at = CURRENT_TIMESTAMP
RETURNING id, query, searched_at;


/* @name DeleteRecentSearch */
DELETE FROM contacts.search_history sh
USING auth.users u
WHERE sh.user_id = u.id
  AND u.external_id = :userExternalId
  AND sh.query = :query
RETURNING sh.id;


/* @name ClearRecentSearches */
DELETE FROM contacts.search_history sh
USING auth.users u
WHERE sh.user_id = u.id
  AND u.external_id = :userExternalId
RETURNING sh.id;
