/* @name GetAppPasswordsByUserExternalId */
SELECT
  ap.external_id,
  ap.name,
  ap.password_prefix,
  ap.last_used_at,
  ap.created_at
FROM auth.app_passwords ap
INNER JOIN auth.users u ON ap.user_id = u.id
WHERE u.external_id = :userExternalId
  AND ap.revoked_at IS NULL
ORDER BY ap.created_at DESC;

/* @name GetAppPasswordsByUserIdAndPrefix */
SELECT
  ap.id,
  ap.external_id,
  ap.password_hash
FROM auth.app_passwords ap
WHERE ap.user_id = :userId
  AND ap.password_prefix = :prefix
  AND ap.revoked_at IS NULL;

/* @name CreateAppPassword */
INSERT INTO auth.app_passwords (user_id, name, password_hash, password_prefix)
SELECT u.id, :name, :passwordHash, :passwordPrefix
FROM auth.users u
WHERE u.external_id = :userExternalId
RETURNING external_id, name, password_prefix, created_at;

/* @name RevokeAppPassword */
UPDATE auth.app_passwords ap
SET revoked_at = NOW()
FROM auth.users u
WHERE ap.user_id = u.id
  AND u.external_id = :userExternalId
  AND ap.external_id = :appPasswordExternalId
  AND ap.revoked_at IS NULL
RETURNING ap.external_id;

/* @name UpdateAppPasswordLastUsed */
UPDATE auth.app_passwords
SET last_used_at = NOW()
WHERE id = :id;

/* @name GetUserByEmailWithInternalId */
SELECT
  u.id,
  u.external_id,
  u.email
FROM auth.users u
WHERE u.email = :email;
