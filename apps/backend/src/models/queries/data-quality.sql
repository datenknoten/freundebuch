/* @name RefreshFieldMeta */
SELECT data_quality.refresh_field_meta(c.id, :source!) AS refreshed
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId!
  AND u.external_id = :userExternalId!
  AND c.deleted_at IS NULL;

/*
 * One row per scoreable friend, with everything the urgency boosts need.
 *
 * The self-profile is the user's own record rather than a friend, and archived
 * friends are deliberately out of scope, so both are excluded here — from the
 * suggestions and from the data-quality index alike.
 */
/* @name GetDataQualityFriendRows */
WITH scoreable AS (
    SELECT
        c.id,
        c.external_id,
        c.display_name,
        c.photo_thumbnail_url,
        c.is_favorite,
        c.created_at
    FROM friends.friends c
    INNER JOIN auth.users u ON c.user_id = u.id
    WHERE u.external_id = :userExternalId!
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND (u.self_profile_id IS NULL OR c.id <> u.self_profile_id)
),
birthday_calc AS (
    SELECT
        s.id AS friend_id,
        EXTRACT(MONTH FROM d.date_value)::int AS date_month,
        EXTRACT(DAY FROM d.date_value)::int AS date_day,
        EXTRACT(YEAR FROM CURRENT_DATE)::int AS current_year
    FROM scoreable s
    INNER JOIN friends.friend_dates d ON d.friend_id = s.id
    WHERE d.date_type = 'birthday'
),
birthday_safe AS (
    SELECT
        bc.*,
        -- Handle Feb 29 in non-leap years by using Feb 28
        CASE
            WHEN bc.date_month = 2 AND bc.date_day = 29
                 AND NOT (bc.current_year % 4 = 0 AND (bc.current_year % 100 != 0 OR bc.current_year % 400 = 0))
            THEN 28
            ELSE bc.date_day
        END AS safe_day_current,
        CASE
            WHEN bc.date_month = 2 AND bc.date_day = 29
                 AND NOT ((bc.current_year + 1) % 4 = 0 AND ((bc.current_year + 1) % 100 != 0 OR (bc.current_year + 1) % 400 = 0))
            THEN 28
            ELSE bc.date_day
        END AS safe_day_next
    FROM birthday_calc bc
),
birthday_days AS (
    SELECT
        bs.friend_id,
        MIN(
            CASE
                WHEN MAKE_DATE(bs.current_year, bs.date_month, bs.safe_day_current) >= CURRENT_DATE
                THEN MAKE_DATE(bs.current_year, bs.date_month, bs.safe_day_current) - CURRENT_DATE
                ELSE MAKE_DATE(bs.current_year + 1, bs.date_month, bs.safe_day_next) - CURRENT_DATE
            END
        ) AS days_until_birthday
    FROM birthday_safe bs
    GROUP BY bs.friend_id
)
SELECT
    s.external_id,
    s.display_name,
    s.photo_thumbnail_url,
    s.is_favorite,
    s.created_at,
    (
        SELECT MIN(ci.sort_order)
        FROM friends.friend_circles fc
        INNER JOIN friends.circles ci ON fc.circle_id = ci.id
        WHERE fc.friend_id = s.id
    ) AS min_circle_sort_order,
    bd.days_until_birthday,
    (
        SELECT CURRENT_DATE - MAX(e.encounter_date)
        FROM encounters.encounters e
        INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
        WHERE ef.friend_id = s.id
          AND e.encounter_date <= CURRENT_DATE
    ) AS days_since_last_encounter,
    (
        SELECT MIN(e.encounter_date) - CURRENT_DATE
        FROM encounters.encounters e
        INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
        WHERE ef.friend_id = s.id
          AND e.encounter_date > CURRENT_DATE
    ) AS days_until_next_encounter
FROM scoreable s
LEFT JOIN birthday_days bd ON bd.friend_id = s.id;

/*
 * Presence and provenance for every friend of a user.
 *
 * Presence is read from `value_fingerprint IS NOT NULL` so the presence rule has
 * exactly one definition — data_quality.current_field_state.
 */
/* @name GetDataQualityFieldMeta */
SELECT
    c.external_id AS friend_external_id,
    m.field_key,
    (m.value_fingerprint IS NOT NULL) AS is_present,
    m.verified_at,
    m.is_not_applicable
FROM data_quality.field_meta m
INNER JOIN friends.friends c ON m.friend_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE u.external_id = :userExternalId!
  AND c.deleted_at IS NULL;

/* @name GetActiveSnoozes */
SELECT
    c.external_id AS friend_external_id,
    s.field_key,
    s.snoozed_until
FROM data_quality.snoozes s
INNER JOIN friends.friends c ON s.friend_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE u.external_id = :userExternalId!
  AND c.deleted_at IS NULL
  AND s.snoozed_until >= CURRENT_DATE;

/*
 * The anti-nag rule lives here so a client cannot bypass it: the first "Später"
 * defers by the requested number of days, the second escalates to 90 days.
 */
/* @name UpsertSnooze */
INSERT INTO data_quality.snoozes (friend_id, field_key, snoozed_until, reason, later_count)
SELECT
    c.id,
    :fieldKey,
    (CURRENT_DATE + :days!::int)::date,
    :reason!,
    CASE WHEN :reason! = 'later' THEN 1 ELSE 0 END
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId!
  AND u.external_id = :userExternalId!
  AND c.deleted_at IS NULL
ON CONFLICT (friend_id, COALESCE(field_key, ''))
DO UPDATE SET
    later_count = CASE WHEN EXCLUDED.reason = 'later'
                       THEN snoozes.later_count + 1 ELSE 0 END,
    reason = EXCLUDED.reason,
    snoozed_until = CASE WHEN EXCLUDED.reason = 'later' AND snoozes.later_count >= 1
                         THEN (CURRENT_DATE + INTERVAL '90 days')::date
                         ELSE EXCLUDED.snoozed_until END,
    updated_at = CURRENT_TIMESTAMP
RETURNING external_id, field_key, snoozed_until, reason, later_count;

/* @name SetFieldNotApplicable */
INSERT INTO data_quality.field_meta (friend_id, field_key, is_not_applicable, source)
SELECT c.id, :fieldKey!, :value!::boolean, 'manual'
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId!
  AND u.external_id = :userExternalId!
  AND c.deleted_at IS NULL
ON CONFLICT (friend_id, field_key)
DO UPDATE SET
    is_not_applicable = EXCLUDED.is_not_applicable,
    updated_at = CURRENT_TIMESTAMP
RETURNING external_id, field_key, is_not_applicable;

/* @name GetDqIndexHistory */
SELECT h.snapshot_date, h.index_value
FROM data_quality.index_history h
INNER JOIN auth.users u ON h.user_id = u.id
WHERE u.external_id = :userExternalId!
  AND h.snapshot_date >= :sinceDate!::date
ORDER BY h.snapshot_date ASC;

/* @name UpsertDqIndexSnapshot */
INSERT INTO data_quality.index_history (user_id, snapshot_date, index_value)
SELECT u.id, :snapshotDate!::date, :indexValue!::numeric
FROM auth.users u
WHERE u.external_id = :userExternalId!
ON CONFLICT (user_id, snapshot_date)
DO UPDATE SET
    index_value = EXCLUDED.index_value,
    updated_at = CURRENT_TIMESTAMP
RETURNING external_id, snapshot_date, index_value;

/* @name ListUserExternalIds */
SELECT external_id FROM auth.users;
