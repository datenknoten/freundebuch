/* @name GetContactById */
SELECT
    c.external_id,
    c.display_name,
    c.name_prefix,
    c.name_first,
    c.name_middle,
    c.name_last,
    c.name_suffix,
    c.photo_url,
    c.photo_thumbnail_url,
    c.created_at,
    c.updated_at,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', p.external_id,
            'phone_number', p.phone_number,
            'phone_type', p.phone_type,
            'label', p.label,
            'is_primary', p.is_primary,
            'created_at', p.created_at
        ) ORDER BY p.is_primary DESC, p.created_at ASC), '[]'::json)
        FROM contacts.contact_phones p
        WHERE p.contact_id = c.id
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
        FROM contacts.contact_emails e
        WHERE e.contact_id = c.id
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
        FROM contacts.contact_addresses a
        WHERE a.contact_id = c.id
    ) as addresses,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'external_id', u.external_id,
            'url', u.url,
            'url_type', u.url_type,
            'label', u.label,
            'created_at', u.created_at
        ) ORDER BY u.created_at ASC), '[]'::json)
        FROM contacts.contact_urls u
        WHERE u.contact_id = c.id
    ) as urls
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name GetContactInternalId */
SELECT c.id
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name GetContactsByUserId */
WITH contact_list AS (
    SELECT
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.created_at,
        c.updated_at
    FROM contacts.contacts c
    INNER JOIN auth.users u ON c.user_id = u.id
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
),
total AS (
    SELECT COUNT(*)::int as total_count FROM contact_list
)
SELECT
    cl.external_id,
    cl.display_name,
    cl.photo_thumbnail_url,
    cl.created_at,
    cl.updated_at,
    (SELECT e.email_address FROM contacts.contact_emails e WHERE e.contact_id = cl.id AND e.is_primary = true LIMIT 1) as primary_email,
    (SELECT p.phone_number FROM contacts.contact_phones p WHERE p.contact_id = cl.id AND p.is_primary = true LIMIT 1) as primary_phone,
    t.total_count
FROM contact_list cl
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

/* @name CreateContact */
INSERT INTO contacts.contacts (
    user_id,
    display_name,
    name_prefix,
    name_first,
    name_middle,
    name_last,
    name_suffix
)
SELECT
    u.id,
    :displayName,
    :namePrefix,
    :nameFirst,
    :nameMiddle,
    :nameLast,
    :nameSuffix
FROM auth.users u
WHERE u.external_id = :userExternalId
RETURNING
    external_id,
    display_name,
    name_prefix,
    name_first,
    name_middle,
    name_last,
    name_suffix,
    photo_url,
    photo_thumbnail_url,
    created_at,
    updated_at;

/* @name UpdateContact */
UPDATE contacts.contacts c
SET
    display_name = COALESCE(:displayName, c.display_name),
    name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,
    name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,
    name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,
    name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,
    name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END
FROM auth.users u
WHERE c.external_id = :contactExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    c.external_id,
    c.display_name,
    c.name_prefix,
    c.name_first,
    c.name_middle,
    c.name_last,
    c.name_suffix,
    c.photo_url,
    c.photo_thumbnail_url,
    c.created_at,
    c.updated_at;

/* @name SoftDeleteContact */
UPDATE contacts.contacts c
SET deleted_at = CURRENT_TIMESTAMP
FROM auth.users u
WHERE c.external_id = :contactExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING c.external_id;

/* @name UpdateContactPhoto */
UPDATE contacts.contacts c
SET
    photo_url = :photoUrl,
    photo_thumbnail_url = :photoThumbnailUrl
FROM auth.users u
WHERE c.external_id = :contactExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    c.external_id,
    c.photo_url,
    c.photo_thumbnail_url;
