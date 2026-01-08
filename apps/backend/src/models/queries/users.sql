/* @name GetUserByExternalId */
SELECT external_id, email, created_at, updated_at
FROM auth.users
WHERE external_id = :externalId;

/* @name GetUserByEmail */
SELECT external_id, email, password_hash, created_at, updated_at
FROM auth.users
WHERE email = :email;

/* @name CreateUser */
INSERT INTO auth.users (email, password_hash)
VALUES (:email, :passwordHash)
RETURNING external_id, email, created_at, updated_at;

/* @name UpdateUser */
UPDATE auth.users
SET email = :email, updated_at = CURRENT_TIMESTAMP
WHERE external_id = :externalId
RETURNING external_id, email, created_at, updated_at;

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
