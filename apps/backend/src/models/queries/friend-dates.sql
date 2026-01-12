/* @name GetDatesByFriendId */
SELECT
    d.external_id,
    d.date_value,
    d.year_known,
    d.date_type,
    d.label,
    d.created_at
FROM friends.friend_dates d
INNER JOIN friends.friends c ON d.friend_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
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
FROM friends.friend_dates d
INNER JOIN friends.friends c ON d.friend_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE d.external_id = :dateExternalId
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name CreateDate */
INSERT INTO friends.friend_dates (
    friend_id,
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
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
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
UPDATE friends.friend_dates d
SET
    date_value = :dateValue::date,
    year_known = :yearKnown,
    date_type = :dateType,
    label = :label
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE d.external_id = :dateExternalId
  AND d.friend_id = c.id
  AND c.external_id = :friendExternalId
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
DELETE FROM friends.friend_dates d
USING friends.friends c, auth.users u
WHERE d.external_id = :dateExternalId
  AND d.friend_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING d.external_id;

/* @name CountBirthdaysForFriend */
SELECT COUNT(*)::int as count
FROM friends.friend_dates d
INNER JOIN friends.friends c ON d.friend_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND d.date_type = 'birthday';

/* @name GetUpcomingDates */
WITH date_calc AS (
    SELECT
        d.external_id AS date_external_id,
        d.date_value,
        d.year_known,
        d.date_type,
        d.label,
        c.external_id AS friend_external_id,
        c.display_name AS friend_display_name,
        c.photo_thumbnail_url AS friend_photo_thumbnail_url,
        EXTRACT(MONTH FROM d.date_value)::int AS date_month,
        EXTRACT(DAY FROM d.date_value)::int AS date_day,
        EXTRACT(YEAR FROM CURRENT_DATE)::int AS current_year
    FROM friends.friend_dates d
    INNER JOIN friends.friends c ON d.friend_id = c.id
    INNER JOIN auth.users u ON c.user_id = u.id
    WHERE u.external_id = :userExternalId
      AND c.deleted_at IS NULL
),
safe_dates AS (
    SELECT
        dc.*,
        -- Handle Feb 29 in non-leap years by using Feb 28
        CASE
            WHEN dc.date_month = 2 AND dc.date_day = 29
                 AND NOT (dc.current_year % 4 = 0 AND (dc.current_year % 100 != 0 OR dc.current_year % 400 = 0))
            THEN 28
            ELSE dc.date_day
        END AS safe_day_current,
        CASE
            WHEN dc.date_month = 2 AND dc.date_day = 29
                 AND NOT ((dc.current_year + 1) % 4 = 0 AND ((dc.current_year + 1) % 100 != 0 OR (dc.current_year + 1) % 400 = 0))
            THEN 28
            ELSE dc.date_day
        END AS safe_day_next
    FROM date_calc dc
),
with_days_until AS (
    SELECT
        sd.date_external_id,
        sd.date_value,
        sd.year_known,
        sd.date_type,
        sd.label,
        sd.friend_external_id,
        sd.friend_display_name,
        sd.friend_photo_thumbnail_url,
        CASE
            WHEN MAKE_DATE(sd.current_year, sd.date_month, sd.safe_day_current) >= CURRENT_DATE
            THEN MAKE_DATE(sd.current_year, sd.date_month, sd.safe_day_current) - CURRENT_DATE
            ELSE MAKE_DATE(sd.current_year + 1, sd.date_month, sd.safe_day_next) - CURRENT_DATE
        END AS days_until
    FROM safe_dates sd
)
SELECT
    date_external_id,
    date_value,
    year_known,
    date_type,
    label,
    friend_external_id,
    friend_display_name,
    friend_photo_thumbnail_url,
    days_until
FROM with_days_until
WHERE days_until <= :maxDays
ORDER BY days_until ASC, friend_display_name ASC
LIMIT :limitCount;
