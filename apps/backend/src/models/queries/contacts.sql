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
    c.updated_at
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
SELECT
    c.external_id,
    c.display_name,
    c.photo_thumbnail_url,
    c.created_at,
    c.updated_at,
    (SELECT e.email_address FROM contacts.contact_emails e WHERE e.contact_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,
    (SELECT p.phone_number FROM contacts.contact_phones p WHERE p.contact_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY
    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,
    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,
    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,
    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,
    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,
    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC
LIMIT :pageSize
OFFSET :offset;

/* @name CountContactsByUserId */
SELECT COUNT(*)::int as count
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

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
