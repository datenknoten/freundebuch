/* @name GetSocialProfilesByContactId */
SELECT
    sp.external_id,
    sp.platform,
    sp.profile_url,
    sp.username,
    sp.created_at
FROM contacts.contact_social_profiles sp
INNER JOIN contacts.contacts c ON sp.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY sp.platform ASC, sp.created_at ASC;

/* @name GetSocialProfileById */
SELECT
    sp.external_id,
    sp.platform,
    sp.profile_url,
    sp.username,
    sp.created_at
FROM contacts.contact_social_profiles sp
INNER JOIN contacts.contacts c ON sp.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE sp.external_id = :profileExternalId
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name CreateSocialProfile */
INSERT INTO contacts.contact_social_profiles (
    contact_id,
    platform,
    profile_url,
    username
)
SELECT
    c.id,
    :platform,
    :profileUrl,
    :username
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    platform,
    profile_url,
    username,
    created_at;

/* @name UpdateSocialProfile */
UPDATE contacts.contact_social_profiles sp
SET
    platform = :platform,
    profile_url = :profileUrl,
    username = :username
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE sp.external_id = :profileExternalId
  AND sp.contact_id = c.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    sp.external_id,
    sp.platform,
    sp.profile_url,
    sp.username,
    sp.created_at;

/* @name DeleteSocialProfile */
DELETE FROM contacts.contact_social_profiles sp
USING contacts.contacts c, auth.users u
WHERE sp.external_id = :profileExternalId
  AND sp.contact_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING sp.external_id;
