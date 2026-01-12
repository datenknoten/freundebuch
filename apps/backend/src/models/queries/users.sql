/* @name GetUserByExternalId */
SELECT external_id, email, created_at, updated_at
FROM auth.users
WHERE external_id = :externalId;

/* @name GetUserByEmail */
SELECT external_id, email, password_hash, created_at, updated_at
FROM auth.users
WHERE email = :email;

/* @name GetUserByEmailWithSelfProfile */
SELECT
    u.external_id,
    u.email,
    u.created_at,
    u.updated_at,
    c.external_id as self_profile_external_id
FROM auth.users u
LEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL
WHERE u.email = :email;

/* @name CreateUser */
INSERT INTO auth.users (email, password_hash)
VALUES (:email, :passwordHash)
RETURNING external_id, email, created_at, updated_at;

/* @name UpdateUser */
UPDATE auth.users
SET email = :email, updated_at = CURRENT_TIMESTAMP
WHERE external_id = :externalId
RETURNING external_id, email, created_at, updated_at;

/* @name UpdateUserReturningWithSelfProfile */
UPDATE auth.users u
SET email = :email, updated_at = CURRENT_TIMESTAMP
WHERE u.external_id = :externalId
RETURNING
    u.external_id,
    u.email,
    u.created_at,
    u.updated_at,
    (SELECT c.external_id FROM friends.friends c WHERE c.id = u.self_profile_id AND c.deleted_at IS NULL) as self_profile_external_id;

/* @name DeleteUser */
DELETE FROM auth.users
WHERE external_id = :externalId;

/* @name UpdateUserPassword */
UPDATE auth.users
SET password_hash = :passwordHash,
    updated_at = CURRENT_TIMESTAMP
WHERE external_id = :externalId
RETURNING external_id, email, created_at, updated_at;

/* @name GetUserWithPreferences */
SELECT external_id, email, preferences, created_at, updated_at
FROM auth.users
WHERE external_id = :externalId;

/* @name UpdateUserPreferences */
UPDATE auth.users
SET preferences = :preferences,
    updated_at = CURRENT_TIMESTAMP
WHERE external_id = :externalId
RETURNING external_id, email, preferences, created_at, updated_at;

/* @name GetUserSelfProfile */
SELECT
    u.self_profile_id,
    c.external_id as self_profile_external_id
FROM auth.users u
LEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL
WHERE u.external_id = :userExternalId;

/* @name SetUserSelfProfile */
UPDATE auth.users u
SET self_profile_id = c.id,
    updated_at = CURRENT_TIMESTAMP
FROM friends.friends c
WHERE u.external_id = :userExternalId
  AND c.external_id = :friendExternalId
  AND c.user_id = u.id
  AND c.deleted_at IS NULL
RETURNING u.external_id, c.external_id as self_profile_external_id;

/* @name HasSelfProfile */
SELECT
    CASE WHEN u.self_profile_id IS NOT NULL
         AND c.deleted_at IS NULL
    THEN true ELSE false END as has_self_profile
FROM auth.users u
LEFT JOIN friends.friends c ON u.self_profile_id = c.id
WHERE u.external_id = :userExternalId;
