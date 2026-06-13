/* @name GetChannelsByUserId */
SELECT
    nc.external_id,
    nc.platform,
    nc.is_enabled,
    nc.telegram_bot_token,
    nc.telegram_chat_id,
    nc.matrix_homeserver,
    nc.matrix_access_token,
    nc.matrix_room_id,
    nc.discord_webhook_url,
    nc.lookahead_days,
    nc.notify_time,
    nc.last_notified_date,
    nc.created_at,
    nc.updated_at
FROM system.notification_channels nc
INNER JOIN auth.users u ON nc.user_id = u.id
WHERE u.external_id = :userExternalId::uuid
ORDER BY nc.created_at ASC;

/* @name GetChannelByExternalId */
SELECT
    nc.external_id,
    nc.platform,
    nc.is_enabled,
    nc.telegram_bot_token,
    nc.telegram_chat_id,
    nc.matrix_homeserver,
    nc.matrix_access_token,
    nc.matrix_room_id,
    nc.discord_webhook_url,
    nc.lookahead_days,
    nc.notify_time,
    nc.last_notified_date,
    nc.created_at,
    nc.updated_at
FROM system.notification_channels nc
INNER JOIN auth.users u ON nc.user_id = u.id
WHERE nc.external_id = :channelExternalId::uuid
  AND u.external_id = :userExternalId::uuid;

/* @name CreateChannel */
INSERT INTO system.notification_channels (
    user_id,
    platform,
    is_enabled,
    telegram_bot_token,
    telegram_chat_id,
    matrix_homeserver,
    matrix_access_token,
    matrix_room_id,
    discord_webhook_url,
    lookahead_days,
    notify_time
)
SELECT
    u.id,
    :platform,
    COALESCE(:isEnabled, true),
    :telegramBotToken,
    :telegramChatId,
    :matrixHomeserver,
    :matrixAccessToken,
    :matrixRoomId,
    :discordWebhookUrl,
    COALESCE(:lookaheadDays, 7),
    COALESCE(:notifyTime::time, '08:00:00'::time)
FROM auth.users u
WHERE u.external_id = :userExternalId::uuid
RETURNING
    external_id,
    platform,
    is_enabled,
    telegram_bot_token,
    telegram_chat_id,
    matrix_homeserver,
    matrix_access_token,
    matrix_room_id,
    discord_webhook_url,
    lookahead_days,
    notify_time,
    last_notified_date,
    created_at,
    updated_at;

/* @name UpdateChannel */
UPDATE system.notification_channels nc
SET
    is_enabled = COALESCE(:isEnabled, nc.is_enabled),
    telegram_bot_token = COALESCE(:telegramBotToken, nc.telegram_bot_token),
    telegram_chat_id = COALESCE(:telegramChatId, nc.telegram_chat_id),
    matrix_homeserver = COALESCE(:matrixHomeserver, nc.matrix_homeserver),
    matrix_access_token = COALESCE(:matrixAccessToken, nc.matrix_access_token),
    matrix_room_id = COALESCE(:matrixRoomId, nc.matrix_room_id),
    discord_webhook_url = COALESCE(:discordWebhookUrl, nc.discord_webhook_url),
    lookahead_days = COALESCE(:lookaheadDays, nc.lookahead_days),
    notify_time = COALESCE(:notifyTime::time, nc.notify_time),
    updated_at = current_timestamp
FROM auth.users u
WHERE nc.external_id = :channelExternalId::uuid
  AND nc.user_id = u.id
  AND u.external_id = :userExternalId::uuid
RETURNING
    nc.external_id,
    nc.platform,
    nc.is_enabled,
    nc.telegram_bot_token,
    nc.telegram_chat_id,
    nc.matrix_homeserver,
    nc.matrix_access_token,
    nc.matrix_room_id,
    nc.discord_webhook_url,
    nc.lookahead_days,
    nc.notify_time,
    nc.last_notified_date,
    nc.created_at,
    nc.updated_at;

/* @name DeleteChannel */
DELETE FROM system.notification_channels nc
USING auth.users u
WHERE nc.external_id = :channelExternalId::uuid
  AND nc.user_id = u.id
  AND u.external_id = :userExternalId::uuid
RETURNING nc.external_id;

/* @name GetEnabledChannelsDueAt */
SELECT
    nc.id,
    nc.external_id,
    nc.platform,
    nc.telegram_bot_token,
    nc.telegram_chat_id,
    nc.matrix_homeserver,
    nc.matrix_access_token,
    nc.matrix_room_id,
    nc.discord_webhook_url,
    nc.lookahead_days,
    u.external_id AS user_external_id,
    COALESCE(u.preferences->>'language', 'en') AS user_language
FROM system.notification_channels nc
INNER JOIN auth.users u ON nc.user_id = u.id
-- Fire when the channel hasn't been notified today AND either:
--   * notify_time has passed today (notify_time <= now) — the normal case,
--     using <= rather than = so a tick delayed past the minute boundary
--     (GC pause, restart, deploy) still fires on the next tick; or
--   * the channel is overdue — last notified before yesterday — which catches
--     up a digest missed across a day boundary (e.g. notify_time 23:59, the
--     process is down from 23:58 until 00:01, so notify_time is no longer
--     <= the new day's clock). A never-notified channel (NULL) only fires via
--     notify_time, so a newly-created late-in-the-day channel isn't sent early.
WHERE nc.is_enabled = true
  AND (nc.last_notified_date IS NULL OR nc.last_notified_date < :today::date)
  AND (
    nc.notify_time <= :notifyTime::time
    OR nc.last_notified_date < (:today::date - 1)
  );

/* @name MarkChannelNotified */
UPDATE system.notification_channels
SET last_notified_date = :today::date
WHERE id = :channelId
  AND (last_notified_date IS NULL OR last_notified_date < :today::date);
