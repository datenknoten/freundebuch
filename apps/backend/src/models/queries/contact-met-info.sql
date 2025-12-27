/* @name GetMetInfoByContactId */
SELECT
    m.external_id,
    m.met_date,
    m.met_location,
    m.met_context,
    m.created_at,
    m.updated_at
FROM contacts.contact_met_info m
INNER JOIN contacts.contacts c ON m.contact_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name UpsertMetInfo */
INSERT INTO contacts.contact_met_info (
    contact_id,
    met_date,
    met_location,
    met_context
)
SELECT
    c.id,
    :metDate::date,
    :metLocation,
    :metContext
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ON CONFLICT (contact_id)
DO UPDATE SET
    met_date = :metDate::date,
    met_location = :metLocation,
    met_context = :metContext,
    updated_at = CURRENT_TIMESTAMP
RETURNING
    external_id,
    met_date,
    met_location,
    met_context,
    created_at,
    updated_at;

/* @name DeleteMetInfo */
DELETE FROM contacts.contact_met_info m
USING contacts.contacts c, auth.users u
WHERE m.contact_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING m.external_id;
