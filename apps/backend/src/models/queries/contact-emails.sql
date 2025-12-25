/* @name GetEmailsByContactId */
SELECT
    e.external_id,
    e.email_address,
    e.email_type,
    e.label,
    e.is_primary,
    e.created_at
FROM contacts.contact_emails e
INNER JOIN contacts.contacts c ON e.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY e.is_primary DESC, e.created_at ASC;

/* @name GetEmailById */
SELECT
    e.external_id,
    e.email_address,
    e.email_type,
    e.label,
    e.is_primary,
    e.created_at
FROM contacts.contact_emails e
INNER JOIN contacts.contacts c ON e.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE e.external_id = :emailExternalId
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name CreateEmail */
INSERT INTO contacts.contact_emails (
    contact_id,
    email_address,
    email_type,
    label,
    is_primary
)
SELECT
    c.id,
    :emailAddress,
    :emailType,
    :label,
    :isPrimary
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    email_address,
    email_type,
    label,
    is_primary,
    created_at;

/* @name UpdateEmail */
UPDATE contacts.contact_emails e
SET
    email_address = :emailAddress,
    email_type = :emailType,
    label = :label,
    is_primary = :isPrimary
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE e.external_id = :emailExternalId
  AND e.contact_id = c.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    e.external_id,
    e.email_address,
    e.email_type,
    e.label,
    e.is_primary,
    e.created_at;

/* @name DeleteEmail */
DELETE FROM contacts.contact_emails e
USING contacts.contacts c, auth.users u
WHERE e.external_id = :emailExternalId
  AND e.contact_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING e.external_id;

/* @name ClearPrimaryEmail */
UPDATE contacts.contact_emails e
SET is_primary = false
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE e.contact_id = c.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND e.is_primary = true;
