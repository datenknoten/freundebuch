/* @name GetDatesByContactId */
SELECT
    d.external_id,
    d.date_value,
    d.year_known,
    d.date_type,
    d.label,
    d.created_at
FROM contacts.contact_dates d
INNER JOIN contacts.contacts c ON d.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY d.date_type ASC, d.created_at ASC;

/* @name GetDateById */
SELECT
    d.external_id,
    d.date_value,
    d.year_known,
    d.date_type,
    d.label,
    d.created_at
FROM contacts.contact_dates d
INNER JOIN contacts.contacts c ON d.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE d.external_id = :dateExternalId
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name CreateDate */
INSERT INTO contacts.contact_dates (
    contact_id,
    date_value,
    year_known,
    date_type,
    label
)
SELECT
    c.id,
    :dateValue::date,
    :yearKnown,
    :dateType,
    :label
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    date_value,
    year_known,
    date_type,
    label,
    created_at;

/* @name UpdateDate */
UPDATE contacts.contact_dates d
SET
    date_value = :dateValue::date,
    year_known = :yearKnown,
    date_type = :dateType,
    label = :label
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE d.external_id = :dateExternalId
  AND d.contact_id = c.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    d.external_id,
    d.date_value,
    d.year_known,
    d.date_type,
    d.label,
    d.created_at;

/* @name DeleteDate */
DELETE FROM contacts.contact_dates d
USING contacts.contacts c, auth.users u
WHERE d.external_id = :dateExternalId
  AND d.contact_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING d.external_id;

/* @name CountBirthdaysForContact */
SELECT COUNT(*)::int as count
FROM contacts.contact_dates d
INNER JOIN contacts.contacts c ON d.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND d.date_type = 'birthday';
