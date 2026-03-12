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
    u.id as external_id,
    u.email,
    u.created_at,
    u.updated_at,
    c.external_id as self_profile_external_id
FROM auth."user" u
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
SELECT id as external_id, email, preferences, created_at, updated_at
FROM auth."user"
WHERE id = :externalId;

/* @name UpdateUserPreferences */
UPDATE auth."user"
SET preferences = :preferences,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :externalId
RETURNING id as external_id, email, preferences, created_at, updated_at;

/* @name GetUserSelfProfile */
SELECT
    u.self_profile_id,
    c.external_id as self_profile_external_id
FROM auth."user" u
LEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL
WHERE u.id = :userExternalId;

/* @name GetSelfProfileExternalId */
SELECT external_id as self_profile_external_id
FROM friends.friends
WHERE id = :selfProfileId AND deleted_at IS NULL;

/* @name SetUserSelfProfile */
UPDATE auth."user" ba_u
SET self_profile_id = c.id,
    updated_at = CURRENT_TIMESTAMP
FROM friends.friends c
JOIN auth.users legacy_u ON legacy_u.email = ba_u.email
WHERE ba_u.id = :userExternalId
  AND c.external_id = :friendExternalId
  AND c.user_id = legacy_u.id
  AND c.deleted_at IS NULL
RETURNING ba_u.id as external_id, c.external_id as self_profile_external_id;

/* @name CreateLegacyUserForBetterAuth */
INSERT INTO auth.users (email, password_hash)
VALUES (:email, '')
ON CONFLICT (email) DO NOTHING;

/* @name HasSelfProfile */
SELECT
    CASE WHEN u.self_profile_id IS NOT NULL
         AND c.deleted_at IS NULL
    THEN true ELSE false END as has_self_profile
FROM auth."user" u
LEFT JOIN friends.friends c ON u.self_profile_id = c.id
WHERE u.id = :userExternalId;
