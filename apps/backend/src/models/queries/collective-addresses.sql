/* @name GetAddressesByCollectiveId */
SELECT
    a.external_id,
    a.street_line1,
    a.street_line2,
    a.city,
    a.state_province,
    a.postal_code,
    a.country,
    a.address_type,
    a.label,
    a.is_primary,
    a.created_at
FROM collectives.collective_addresses a
INNER JOIN collectives.collectives c ON a.collective_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY a.is_primary DESC, a.created_at ASC;

/* @name GetAddressById */
SELECT
    a.external_id,
    a.street_line1,
    a.street_line2,
    a.city,
    a.state_province,
    a.postal_code,
    a.country,
    a.address_type,
    a.label,
    a.is_primary,
    a.created_at
FROM collectives.collective_addresses a
INNER JOIN collectives.collectives c ON a.collective_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE a.external_id = :addressExternalId
  AND c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name CreateAddress */
INSERT INTO collectives.collective_addresses (
    collective_id,
    street_line1,
    street_line2,
    city,
    state_province,
    postal_code,
    country,
    address_type,
    label,
    is_primary
)
SELECT
    c.id,
    :streetLine1,
    :streetLine2,
    :city,
    :stateProvince,
    :postalCode,
    :country,
    :addressType,
    :label,
    :isPrimary
FROM collectives.collectives c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    street_line1,
    street_line2,
    city,
    state_province,
    postal_code,
    country,
    address_type,
    label,
    is_primary,
    created_at;

/* @name UpdateAddress */
UPDATE collectives.collective_addresses a
SET
    street_line1 = :streetLine1,
    street_line2 = :streetLine2,
    city = :city,
    state_province = :stateProvince,
    postal_code = :postalCode,
    country = :country,
    address_type = :addressType,
    label = :label,
    is_primary = :isPrimary
FROM collectives.collectives c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE a.external_id = :addressExternalId
  AND a.collective_id = c.id
  AND c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    a.external_id,
    a.street_line1,
    a.street_line2,
    a.city,
    a.state_province,
    a.postal_code,
    a.country,
    a.address_type,
    a.label,
    a.is_primary,
    a.created_at;

/* @name DeleteAddress */
DELETE FROM collectives.collective_addresses a
USING collectives.collectives c, auth.users u
WHERE a.external_id = :addressExternalId
  AND a.collective_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING a.external_id;

/* @name ClearPrimaryAddress */
UPDATE collectives.collective_addresses a
SET is_primary = false
FROM collectives.collectives c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE a.collective_id = c.id
  AND c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND a.is_primary = true;
