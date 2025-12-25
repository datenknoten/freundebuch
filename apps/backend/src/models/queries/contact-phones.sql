/* @name GetPhonesByContactId */
SELECT
    p.external_id,
    p.phone_number,
    p.phone_type,
    p.label,
    p.is_primary,
    p.created_at
FROM contact_phones p
INNER JOIN contacts c ON p.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY p.is_primary DESC, p.created_at ASC;

/* @name GetPhoneById */
SELECT
    p.external_id,
    p.phone_number,
    p.phone_type,
    p.label,
    p.is_primary,
    p.created_at
FROM contact_phones p
INNER JOIN contacts c ON p.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE p.external_id = :phoneExternalId
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name CreatePhone */
INSERT INTO contact_phones (
    contact_id,
    phone_number,
    phone_type,
    label,
    is_primary
)
SELECT
    c.id,
    :phoneNumber,
    :phoneType,
    :label,
    :isPrimary
FROM contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    phone_number,
    phone_type,
    label,
    is_primary,
    created_at;

/* @name UpdatePhone */
UPDATE contact_phones p
SET
    phone_number = :phoneNumber,
    phone_type = :phoneType,
    label = :label,
    is_primary = :isPrimary
FROM contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE p.external_id = :phoneExternalId
  AND p.contact_id = c.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    p.external_id,
    p.phone_number,
    p.phone_type,
    p.label,
    p.is_primary,
    p.created_at;

/* @name DeletePhone */
DELETE FROM contact_phones p
USING contacts c, auth.users u
WHERE p.external_id = :phoneExternalId
  AND p.contact_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING p.external_id;

/* @name ClearPrimaryPhone */
UPDATE contact_phones p
SET is_primary = false
FROM contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE p.contact_id = c.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND p.is_primary = true;
