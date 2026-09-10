/* @name GetUserWithSelfProfile */
SELECT
    u.id as external_id,
    u.email,
    u.created_at,
    u.updated_at,
    c.external_id as self_profile_external_id,
    c.display_name as self_profile_display_name
FROM auth."user" u
LEFT JOIN friends.friends c ON u.self_profile_id = c.id AND c.deleted_at IS NULL
WHERE u.id = :userExternalId;

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
    -- Read fresh, not from the session: the Better Auth cookie cache holds a
    -- 5-minute-old copy of both columns (see GET /api/auth/me).
    u.preferences,
    c.external_id as self_profile_external_id,
    c.display_name as self_profile_display_name
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
FROM friends.friends c, auth.users legacy_u
WHERE ba_u.id = :userExternalId
  AND legacy_u.external_id::text = ba_u.id
  AND c.external_id = :friendExternalId
  AND c.user_id = legacy_u.id
  AND c.deleted_at IS NULL
RETURNING ba_u.id as external_id, c.external_id as self_profile_external_id;

/* @name DeleteOrphanLegacyUsers */
SELECT auth.delete_orphan_legacy_users() as deleted_count;

/* @name HasSelfProfile */
SELECT
    CASE WHEN u.self_profile_id IS NOT NULL
         AND c.deleted_at IS NULL
    THEN true ELSE false END as has_self_profile
FROM auth."user" u
LEFT JOIN friends.friends c ON u.self_profile_id = c.id
WHERE u.id = :userExternalId;
