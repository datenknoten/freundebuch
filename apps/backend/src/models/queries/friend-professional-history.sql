/*
 * Professional History CRUD queries
 * Employment history with date ranges for friends
 */

/* @name GetProfessionalHistoryByFriendId */
SELECT
    ph.external_id,
    ph.job_title,
    ph.organization,
    ph.department,
    ph.notes,
    ph.from_month,
    ph.from_year,
    ph.to_month,
    ph.to_year,
    ph.is_primary,
    ph.created_at
FROM friends.friend_professional_history ph
INNER JOIN friends.friends f ON ph.friend_id = f.id
INNER JOIN auth.users u ON f.user_id = u.id
WHERE f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
ORDER BY ph.is_primary DESC, ph.to_year IS NULL DESC, ph.from_year DESC, ph.from_month DESC, ph.created_at DESC;


/* @name GetProfessionalHistoryById */
SELECT
    ph.external_id,
    ph.job_title,
    ph.organization,
    ph.department,
    ph.notes,
    ph.from_month,
    ph.from_year,
    ph.to_month,
    ph.to_year,
    ph.is_primary,
    ph.created_at
FROM friends.friend_professional_history ph
INNER JOIN friends.friends f ON ph.friend_id = f.id
INNER JOIN auth.users u ON f.user_id = u.id
WHERE ph.external_id = :historyExternalId
  AND f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL;


/* @name CreateProfessionalHistory */
INSERT INTO friends.friend_professional_history (
    friend_id,
    job_title,
    organization,
    department,
    notes,
    from_month,
    from_year,
    to_month,
    to_year,
    is_primary
)
SELECT
    f.id,
    :jobTitle,
    :organization,
    :department,
    :notes,
    :fromMonth::smallint,
    :fromYear::smallint,
    :toMonth::smallint,
    :toYear::smallint,
    :isPrimary
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
WHERE f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
RETURNING
    external_id,
    job_title,
    organization,
    department,
    notes,
    from_month,
    from_year,
    to_month,
    to_year,
    is_primary,
    created_at;


/* @name UpdateProfessionalHistory */
UPDATE friends.friend_professional_history ph
SET
    job_title = :jobTitle,
    organization = :organization,
    department = :department,
    notes = :notes,
    from_month = :fromMonth::smallint,
    from_year = :fromYear::smallint,
    to_month = :toMonth::smallint,
    to_year = :toYear::smallint,
    is_primary = :isPrimary
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
WHERE ph.external_id = :historyExternalId
  AND ph.friend_id = f.id
  AND f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
RETURNING
    ph.external_id,
    ph.job_title,
    ph.organization,
    ph.department,
    ph.notes,
    ph.from_month,
    ph.from_year,
    ph.to_month,
    ph.to_year,
    ph.is_primary,
    ph.created_at;


/* @name DeleteProfessionalHistory */
DELETE FROM friends.friend_professional_history ph
USING friends.friends f, auth.users u
WHERE ph.external_id = :historyExternalId
  AND ph.friend_id = f.id
  AND f.user_id = u.id
  AND f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
RETURNING ph.external_id;


/* @name ClearPrimaryProfessionalHistory */
-- Sets is_primary = false for all professional history entries for a friend
-- Used before setting a new primary entry
UPDATE friends.friend_professional_history ph
SET is_primary = false
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
WHERE ph.friend_id = f.id
  AND ph.is_primary = true
  AND f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
RETURNING ph.external_id;


/* @name GetPrimaryProfessionalHistory */
-- Get the primary professional history entry for a friend (for CardDAV/search)
SELECT
    ph.external_id,
    ph.job_title,
    ph.organization,
    ph.department,
    ph.notes,
    ph.from_month,
    ph.from_year,
    ph.to_month,
    ph.to_year,
    ph.is_primary,
    ph.created_at
FROM friends.friend_professional_history ph
INNER JOIN friends.friends f ON ph.friend_id = f.id
WHERE f.id = :friendId
  AND ph.is_primary = true
LIMIT 1;
