/* @name GetFriendById */
SELECT
    c.external_id,
    c.display_name,
    c.nickname,
    c.name_prefix,
    c.name_first,
    c.name_middle,
    c.name_last,
    c.name_suffix,
    c.photo_url,
    c.photo_thumbnail_url,
    -- Epic 1B: Professional fields
    c.job_title,
    c.organization,
    c.department,
    c.work_notes,
    c.interests,
    c.created_at,
    c.updated_at,
    -- Epic 1A: Sub-resources
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', p.external_id,
            'phone_number', p.phone_number,
            'phone_type', p.phone_type,
            'label', p.label,
            'is_primary', p.is_primary,
            'created_at', p.created_at
        ) ORDER BY p.is_primary DESC, p.created_at ASC), '[]'::json)
        FROM friends.friend_phones p
        WHERE p.friend_id = c.id
    ) as phones,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', e.external_id,
            'email_address', e.email_address,
            'email_type', e.email_type,
            'label', e.label,
            'is_primary', e.is_primary,
            'created_at', e.created_at
        ) ORDER BY e.is_primary DESC, e.created_at ASC), '[]'::json)
        FROM friends.friend_emails e
        WHERE e.friend_id = c.id
    ) as emails,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', a.external_id,
            'street_line1', a.street_line1,
            'street_line2', a.street_line2,
            'city', a.city,
            'state_province', a.state_province,
            'postal_code', a.postal_code,
            'country', a.country,
            'address_type', a.address_type,
            'label', a.label,
            'is_primary', a.is_primary,
            'created_at', a.created_at
        ) ORDER BY a.is_primary DESC, a.created_at ASC), '[]'::json)
        FROM friends.friend_addresses a
        WHERE a.friend_id = c.id
    ) as addresses,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', url.external_id,
            'url', url.url,
            'url_type', url.url_type,
            'label', url.label,
            'created_at', url.created_at
        ) ORDER BY url.created_at ASC), '[]'::json)
        FROM friends.friend_urls url
        WHERE url.friend_id = c.id
    ) as urls,
    -- Epic 1B: Extended sub-resources
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', d.external_id,
            'date_value', d.date_value,
            'year_known', d.year_known,
            'date_type', d.date_type,
            'label', d.label,
            'created_at', d.created_at
        ) ORDER BY d.date_type ASC, d.created_at ASC), '[]'::json)
        FROM friends.friend_dates d
        WHERE d.friend_id = c.id
    ) as dates,
    (
        SELECT json_build_object(
            'external_id', m.external_id,
            'met_date', m.met_date,
            'met_location', m.met_location,
            'met_context', m.met_context,
            'created_at', m.created_at,
            'updated_at', m.updated_at
        )
        FROM friends.friend_met_info m
        WHERE m.friend_id = c.id
    ) as met_info,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', sp.external_id,
            'platform', sp.platform,
            'profile_url', sp.profile_url,
            'username', sp.username,
            'created_at', sp.created_at
        ) ORDER BY sp.platform ASC, sp.created_at ASC), '[]'::json)
        FROM friends.friend_social_profiles sp
        WHERE sp.friend_id = c.id
    ) as social_profiles,
    -- Epic 1D: Relationships
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', r.external_id,
            'related_friend_external_id', rc.external_id,
            'related_friend_display_name', rc.display_name,
            'related_friend_photo_thumbnail_url', rc.photo_thumbnail_url,
            'relationship_type_id', r.relationship_type_id,
            'relationship_type_label', rt.label,
            'relationship_category', rt.category,
            'notes', r.notes,
            'created_at', r.created_at
        ) ORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC), '[]'::json)
        FROM friends.friend_relationships r
        INNER JOIN friends.friends rc ON r.related_friend_id = rc.id AND rc.deleted_at IS NULL
        INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
        WHERE r.friend_id = c.id
    ) as relationships
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name GetFriendInternalId */
SELECT c.id
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name GetFriendsByUserId */
WITH friend_list AS (
    SELECT
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.created_at,
        c.updated_at
    FROM friends.friends c
    INNER JOIN auth.users u ON c.user_id = u.id
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
),
total AS (
    SELECT COUNT(*)::int as total_count FROM friend_list
)
SELECT
    cl.external_id,
    cl.display_name,
    cl.photo_thumbnail_url,
    cl.created_at,
    cl.updated_at,
    (SELECT e.email_address FROM friends.friend_emails e WHERE e.friend_id = cl.id AND e.is_primary = true LIMIT 1) as primary_email,
    (SELECT p.phone_number FROM friends.friend_phones p WHERE p.friend_id = cl.id AND p.is_primary = true LIMIT 1) as primary_phone,
    t.total_count
FROM friend_list cl
CROSS JOIN total t
ORDER BY
    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN cl.display_name END ASC,
    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN cl.display_name END DESC,
    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN cl.created_at END ASC,
    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN cl.created_at END DESC,
    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN cl.updated_at END ASC,
    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN cl.updated_at END DESC
LIMIT :pageSize
OFFSET :offset;

/* @name CreateFriend */
INSERT INTO friends.friends (
    user_id,
    display_name,
    nickname,
    name_prefix,
    name_first,
    name_middle,
    name_last,
    name_suffix,
    -- Epic 1B: Professional fields
    job_title,
    organization,
    department,
    work_notes,
    interests
)
SELECT
    u.id,
    :displayName,
    :nickname,
    :namePrefix,
    :nameFirst,
    :nameMiddle,
    :nameLast,
    :nameSuffix,
    :jobTitle,
    :organization,
    :department,
    :workNotes,
    :interests
FROM auth.users u
WHERE u.external_id = :userExternalId
RETURNING
    external_id,
    display_name,
    nickname,
    name_prefix,
    name_first,
    name_middle,
    name_last,
    name_suffix,
    photo_url,
    photo_thumbnail_url,
    job_title,
    organization,
    department,
    work_notes,
    interests,
    created_at,
    updated_at;

/* @name UpdateFriend */
UPDATE friends.friends c
SET
    display_name = COALESCE(:displayName, c.display_name),
    nickname = CASE WHEN :updateNickname THEN :nickname ELSE c.nickname END,
    name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,
    name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,
    name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,
    name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,
    name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END,
    -- Epic 1B: Professional fields
    job_title = CASE WHEN :updateJobTitle THEN :jobTitle ELSE c.job_title END,
    organization = CASE WHEN :updateOrganization THEN :organization ELSE c.organization END,
    department = CASE WHEN :updateDepartment THEN :department ELSE c.department END,
    work_notes = CASE WHEN :updateWorkNotes THEN :workNotes ELSE c.work_notes END,
    interests = CASE WHEN :updateInterests THEN :interests ELSE c.interests END
FROM auth.users u
WHERE c.external_id = :friendExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    c.external_id,
    c.display_name,
    c.nickname,
    c.name_prefix,
    c.name_first,
    c.name_middle,
    c.name_last,
    c.name_suffix,
    c.photo_url,
    c.photo_thumbnail_url,
    c.job_title,
    c.organization,
    c.department,
    c.work_notes,
    c.interests,
    c.created_at,
    c.updated_at;

/* @name SoftDeleteFriend */
UPDATE friends.friends c
SET deleted_at = CURRENT_TIMESTAMP
FROM auth.users u
WHERE c.external_id = :friendExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING c.external_id;

/* @name UpdateFriendPhoto */
UPDATE friends.friends c
SET
    photo_url = :photoUrl,
    photo_thumbnail_url = :photoThumbnailUrl
FROM auth.users u
WHERE c.external_id = :friendExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    c.external_id,
    c.photo_url,
    c.photo_thumbnail_url;
