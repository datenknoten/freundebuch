/* @name GetUrlsByContactId */
SELECT
    u.external_id,
    u.url,
    u.url_type,
    u.label,
    u.created_at
FROM contacts.contact_urls u
INNER JOIN contacts.contacts c ON u.contact_id = c.id
INNER JOIN auth.users usr ON c.user_id = usr.id
WHERE c.external_id = :contactExternalId
  AND usr.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY u.created_at ASC;

/* @name GetUrlById */
SELECT
    u.external_id,
    u.url,
    u.url_type,
    u.label,
    u.created_at
FROM contacts.contact_urls u
INNER JOIN contacts.contacts c ON u.contact_id = c.id
INNER JOIN auth.users usr ON c.user_id = usr.id
WHERE u.external_id = :urlExternalId
  AND c.external_id = :contactExternalId
  AND usr.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name CreateUrl */
INSERT INTO contacts.contact_urls (
    contact_id,
    url,
    url_type,
    label
)
SELECT
    c.id,
    :url,
    :urlType,
    :label
FROM contacts.contacts c
INNER JOIN auth.users usr ON c.user_id = usr.id
WHERE c.external_id = :contactExternalId
  AND usr.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    url,
    url_type,
    label,
    created_at;

/* @name UpdateUrl */
UPDATE contacts.contact_urls u
SET
    url = :url,
    url_type = :urlType,
    label = :label
FROM contacts.contacts c
INNER JOIN auth.users usr ON c.user_id = usr.id
WHERE u.external_id = :urlExternalId
  AND u.contact_id = c.id
  AND c.external_id = :contactExternalId
  AND usr.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    u.external_id,
    u.url,
    u.url_type,
    u.label,
    u.created_at;

/* @name DeleteUrl */
DELETE FROM contacts.contact_urls u
USING contacts.contacts c, auth.users usr
WHERE u.external_id = :urlExternalId
  AND u.contact_id = c.id
  AND c.user_id = usr.id
  AND c.external_id = :contactExternalId
  AND usr.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING u.external_id;
