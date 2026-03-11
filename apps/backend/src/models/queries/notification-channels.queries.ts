/** Types generated for queries found in "src/models/queries/notification-channels.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

/** 'GetChannelsByUserId' parameters type */
export interface IGetChannelsByUserIdParams {
  userExternalId?: string | null | void;
}

/** 'GetChannelsByUserId' return type */
export interface IGetChannelsByUserIdResult {
  created_at: Date;
  /** Discord webhook URL */
  discord_webhook_url: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Whether this channel is active for notifications */
  is_enabled: boolean;
  /** Last date a notification was sent (idempotency guard) */
  last_notified_date: Date | null;
  /** Number of days to look ahead for upcoming dates */
  lookahead_days: number;
  /** Matrix access token */
  matrix_access_token: string | null;
  /** Matrix homeserver URL */
  matrix_homeserver: string | null;
  /** Matrix room ID */
  matrix_room_id: string | null;
  /** Time of day (UTC) to send notification */
  notify_time: Date;
  /** Messaging platform type */
  platform: string;
  /** Telegram bot token from BotFather */
  telegram_bot_token: string | null;
  /** Telegram chat ID for message delivery */
  telegram_chat_id: string | null;
  updated_at: Date;
}

/** 'GetChannelsByUserId' query type */
export interface IGetChannelsByUserIdQuery {
  params: IGetChannelsByUserIdParams;
  result: IGetChannelsByUserIdResult;
}

const getChannelsByUserIdIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":431,"b":445}]}],"statement":"SELECT\n    nc.external_id,\n    nc.platform,\n    nc.is_enabled,\n    nc.telegram_bot_token,\n    nc.telegram_chat_id,\n    nc.matrix_homeserver,\n    nc.matrix_access_token,\n    nc.matrix_room_id,\n    nc.discord_webhook_url,\n    nc.lookahead_days,\n    nc.notify_time,\n    nc.last_notified_date,\n    nc.created_at,\n    nc.updated_at\nFROM system.notification_channels nc\nINNER JOIN auth.users u ON nc.user_id = u.id\nWHERE u.external_id = :userExternalId::uuid\nORDER BY nc.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     nc.external_id,
 *     nc.platform,
 *     nc.is_enabled,
 *     nc.telegram_bot_token,
 *     nc.telegram_chat_id,
 *     nc.matrix_homeserver,
 *     nc.matrix_access_token,
 *     nc.matrix_room_id,
 *     nc.discord_webhook_url,
 *     nc.lookahead_days,
 *     nc.notify_time,
 *     nc.last_notified_date,
 *     nc.created_at,
 *     nc.updated_at
 * FROM system.notification_channels nc
 * INNER JOIN auth.users u ON nc.user_id = u.id
 * WHERE u.external_id = :userExternalId::uuid
 * ORDER BY nc.created_at ASC
 * ```
 */
export const getChannelsByUserId = new PreparedQuery<IGetChannelsByUserIdParams,IGetChannelsByUserIdResult>(getChannelsByUserIdIR);


/** 'GetChannelByExternalId' parameters type */
export interface IGetChannelByExternalIdParams {
  channelExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetChannelByExternalId' return type */
export interface IGetChannelByExternalIdResult {
  created_at: Date;
  /** Discord webhook URL */
  discord_webhook_url: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Whether this channel is active for notifications */
  is_enabled: boolean;
  /** Last date a notification was sent (idempotency guard) */
  last_notified_date: Date | null;
  /** Number of days to look ahead for upcoming dates */
  lookahead_days: number;
  /** Matrix access token */
  matrix_access_token: string | null;
  /** Matrix homeserver URL */
  matrix_homeserver: string | null;
  /** Matrix room ID */
  matrix_room_id: string | null;
  /** Time of day (UTC) to send notification */
  notify_time: Date;
  /** Messaging platform type */
  platform: string;
  /** Telegram bot token from BotFather */
  telegram_bot_token: string | null;
  /** Telegram chat ID for message delivery */
  telegram_chat_id: string | null;
  updated_at: Date;
}

/** 'GetChannelByExternalId' query type */
export interface IGetChannelByExternalIdQuery {
  params: IGetChannelByExternalIdParams;
  result: IGetChannelByExternalIdResult;
}

const getChannelByExternalIdIR: any = {"usedParamSet":{"channelExternalId":true,"userExternalId":true},"params":[{"name":"channelExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":432,"b":449}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":479,"b":493}]}],"statement":"SELECT\n    nc.external_id,\n    nc.platform,\n    nc.is_enabled,\n    nc.telegram_bot_token,\n    nc.telegram_chat_id,\n    nc.matrix_homeserver,\n    nc.matrix_access_token,\n    nc.matrix_room_id,\n    nc.discord_webhook_url,\n    nc.lookahead_days,\n    nc.notify_time,\n    nc.last_notified_date,\n    nc.created_at,\n    nc.updated_at\nFROM system.notification_channels nc\nINNER JOIN auth.users u ON nc.user_id = u.id\nWHERE nc.external_id = :channelExternalId::uuid\n  AND u.external_id = :userExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     nc.external_id,
 *     nc.platform,
 *     nc.is_enabled,
 *     nc.telegram_bot_token,
 *     nc.telegram_chat_id,
 *     nc.matrix_homeserver,
 *     nc.matrix_access_token,
 *     nc.matrix_room_id,
 *     nc.discord_webhook_url,
 *     nc.lookahead_days,
 *     nc.notify_time,
 *     nc.last_notified_date,
 *     nc.created_at,
 *     nc.updated_at
 * FROM system.notification_channels nc
 * INNER JOIN auth.users u ON nc.user_id = u.id
 * WHERE nc.external_id = :channelExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 * ```
 */
export const getChannelByExternalId = new PreparedQuery<IGetChannelByExternalIdParams,IGetChannelByExternalIdResult>(getChannelByExternalIdIR);


/** 'CreateChannel' parameters type */
export interface ICreateChannelParams {
  discordWebhookUrl?: string | null | void;
  isEnabled?: boolean | null | void;
  lookaheadDays?: number | null | void;
  matrixAccessToken?: string | null | void;
  matrixHomeserver?: string | null | void;
  matrixRoomId?: string | null | void;
  notifyTime?: DateOrString | null | void;
  platform?: string | null | void;
  telegramBotToken?: string | null | void;
  telegramChatId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateChannel' return type */
export interface ICreateChannelResult {
  created_at: Date;
  /** Discord webhook URL */
  discord_webhook_url: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Whether this channel is active for notifications */
  is_enabled: boolean;
  /** Last date a notification was sent (idempotency guard) */
  last_notified_date: Date | null;
  /** Number of days to look ahead for upcoming dates */
  lookahead_days: number;
  /** Matrix access token */
  matrix_access_token: string | null;
  /** Matrix homeserver URL */
  matrix_homeserver: string | null;
  /** Matrix room ID */
  matrix_room_id: string | null;
  /** Time of day (UTC) to send notification */
  notify_time: Date;
  /** Messaging platform type */
  platform: string;
  /** Telegram bot token from BotFather */
  telegram_bot_token: string | null;
  /** Telegram chat ID for message delivery */
  telegram_chat_id: string | null;
  updated_at: Date;
}

/** 'CreateChannel' query type */
export interface ICreateChannelQuery {
  params: ICreateChannelParams;
  result: ICreateChannelResult;
}

const createChannelIR: any = {"usedParamSet":{"platform":true,"isEnabled":true,"telegramBotToken":true,"telegramChatId":true,"matrixHomeserver":true,"matrixAccessToken":true,"matrixRoomId":true,"discordWebhookUrl":true,"lookaheadDays":true,"notifyTime":true,"userExternalId":true},"params":[{"name":"platform","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":292}]},{"name":"isEnabled","required":false,"transform":{"type":"scalar"},"locs":[{"a":308,"b":317}]},{"name":"telegramBotToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":331,"b":347}]},{"name":"telegramChatId","required":false,"transform":{"type":"scalar"},"locs":[{"a":354,"b":368}]},{"name":"matrixHomeserver","required":false,"transform":{"type":"scalar"},"locs":[{"a":375,"b":391}]},{"name":"matrixAccessToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":398,"b":415}]},{"name":"matrixRoomId","required":false,"transform":{"type":"scalar"},"locs":[{"a":422,"b":434}]},{"name":"discordWebhookUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":441,"b":458}]},{"name":"lookaheadDays","required":false,"transform":{"type":"scalar"},"locs":[{"a":474,"b":487}]},{"name":"notifyTime","required":false,"transform":{"type":"scalar"},"locs":[{"a":507,"b":517}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":584,"b":598}]}],"statement":"INSERT INTO system.notification_channels (\n    user_id,\n    platform,\n    is_enabled,\n    telegram_bot_token,\n    telegram_chat_id,\n    matrix_homeserver,\n    matrix_access_token,\n    matrix_room_id,\n    discord_webhook_url,\n    lookahead_days,\n    notify_time\n)\nSELECT\n    u.id,\n    :platform,\n    COALESCE(:isEnabled, true),\n    :telegramBotToken,\n    :telegramChatId,\n    :matrixHomeserver,\n    :matrixAccessToken,\n    :matrixRoomId,\n    :discordWebhookUrl,\n    COALESCE(:lookaheadDays, 7),\n    COALESCE(:notifyTime::time, '08:00:00'::time)\nFROM auth.users u\nWHERE u.external_id = :userExternalId::uuid\nRETURNING\n    external_id,\n    platform,\n    is_enabled,\n    telegram_bot_token,\n    telegram_chat_id,\n    matrix_homeserver,\n    matrix_access_token,\n    matrix_room_id,\n    discord_webhook_url,\n    lookahead_days,\n    notify_time,\n    last_notified_date,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO system.notification_channels (
 *     user_id,
 *     platform,
 *     is_enabled,
 *     telegram_bot_token,
 *     telegram_chat_id,
 *     matrix_homeserver,
 *     matrix_access_token,
 *     matrix_room_id,
 *     discord_webhook_url,
 *     lookahead_days,
 *     notify_time
 * )
 * SELECT
 *     u.id,
 *     :platform,
 *     COALESCE(:isEnabled, true),
 *     :telegramBotToken,
 *     :telegramChatId,
 *     :matrixHomeserver,
 *     :matrixAccessToken,
 *     :matrixRoomId,
 *     :discordWebhookUrl,
 *     COALESCE(:lookaheadDays, 7),
 *     COALESCE(:notifyTime::time, '08:00:00'::time)
 * FROM auth.users u
 * WHERE u.external_id = :userExternalId::uuid
 * RETURNING
 *     external_id,
 *     platform,
 *     is_enabled,
 *     telegram_bot_token,
 *     telegram_chat_id,
 *     matrix_homeserver,
 *     matrix_access_token,
 *     matrix_room_id,
 *     discord_webhook_url,
 *     lookahead_days,
 *     notify_time,
 *     last_notified_date,
 *     created_at,
 *     updated_at
 * ```
 */
export const createChannel = new PreparedQuery<ICreateChannelParams,ICreateChannelResult>(createChannelIR);


/** 'UpdateChannel' parameters type */
export interface IUpdateChannelParams {
  channelExternalId?: string | null | void;
  discordWebhookUrl?: string | null | void;
  isEnabled?: boolean | null | void;
  lookaheadDays?: number | null | void;
  matrixAccessToken?: string | null | void;
  matrixHomeserver?: string | null | void;
  matrixRoomId?: string | null | void;
  notifyTime?: DateOrString | null | void;
  telegramBotToken?: string | null | void;
  telegramChatId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateChannel' return type */
export interface IUpdateChannelResult {
  created_at: Date;
  /** Discord webhook URL */
  discord_webhook_url: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Whether this channel is active for notifications */
  is_enabled: boolean;
  /** Last date a notification was sent (idempotency guard) */
  last_notified_date: Date | null;
  /** Number of days to look ahead for upcoming dates */
  lookahead_days: number;
  /** Matrix access token */
  matrix_access_token: string | null;
  /** Matrix homeserver URL */
  matrix_homeserver: string | null;
  /** Matrix room ID */
  matrix_room_id: string | null;
  /** Time of day (UTC) to send notification */
  notify_time: Date;
  /** Messaging platform type */
  platform: string;
  /** Telegram bot token from BotFather */
  telegram_bot_token: string | null;
  /** Telegram chat ID for message delivery */
  telegram_chat_id: string | null;
  updated_at: Date;
}

/** 'UpdateChannel' query type */
export interface IUpdateChannelQuery {
  params: IUpdateChannelParams;
  result: IUpdateChannelResult;
}

const updateChannelIR: any = {"usedParamSet":{"isEnabled":true,"telegramBotToken":true,"telegramChatId":true,"matrixHomeserver":true,"matrixAccessToken":true,"matrixRoomId":true,"discordWebhookUrl":true,"lookaheadDays":true,"notifyTime":true,"channelExternalId":true,"userExternalId":true},"params":[{"name":"isEnabled","required":false,"transform":{"type":"scalar"},"locs":[{"a":69,"b":78}]},{"name":"telegramBotToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":147}]},{"name":"telegramChatId","required":false,"transform":{"type":"scalar"},"locs":[{"a":206,"b":220}]},{"name":"matrixHomeserver","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":294}]},{"name":"matrixAccessToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":355,"b":372}]},{"name":"matrixRoomId","required":false,"transform":{"type":"scalar"},"locs":[{"a":430,"b":442}]},{"name":"discordWebhookUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":500,"b":517}]},{"name":"lookaheadDays","required":false,"transform":{"type":"scalar"},"locs":[{"a":575,"b":588}]},{"name":"notifyTime","required":false,"transform":{"type":"scalar"},"locs":[{"a":638,"b":648}]},{"name":"channelExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":750,"b":767}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":821,"b":835}]}],"statement":"UPDATE system.notification_channels nc\nSET\n    is_enabled = COALESCE(:isEnabled, nc.is_enabled),\n    telegram_bot_token = COALESCE(:telegramBotToken, nc.telegram_bot_token),\n    telegram_chat_id = COALESCE(:telegramChatId, nc.telegram_chat_id),\n    matrix_homeserver = COALESCE(:matrixHomeserver, nc.matrix_homeserver),\n    matrix_access_token = COALESCE(:matrixAccessToken, nc.matrix_access_token),\n    matrix_room_id = COALESCE(:matrixRoomId, nc.matrix_room_id),\n    discord_webhook_url = COALESCE(:discordWebhookUrl, nc.discord_webhook_url),\n    lookahead_days = COALESCE(:lookaheadDays, nc.lookahead_days),\n    notify_time = COALESCE(:notifyTime::time, nc.notify_time),\n    updated_at = current_timestamp\nFROM auth.users u\nWHERE nc.external_id = :channelExternalId::uuid\n  AND nc.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\nRETURNING\n    nc.external_id,\n    nc.platform,\n    nc.is_enabled,\n    nc.telegram_bot_token,\n    nc.telegram_chat_id,\n    nc.matrix_homeserver,\n    nc.matrix_access_token,\n    nc.matrix_room_id,\n    nc.discord_webhook_url,\n    nc.lookahead_days,\n    nc.notify_time,\n    nc.last_notified_date,\n    nc.created_at,\n    nc.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE system.notification_channels nc
 * SET
 *     is_enabled = COALESCE(:isEnabled, nc.is_enabled),
 *     telegram_bot_token = COALESCE(:telegramBotToken, nc.telegram_bot_token),
 *     telegram_chat_id = COALESCE(:telegramChatId, nc.telegram_chat_id),
 *     matrix_homeserver = COALESCE(:matrixHomeserver, nc.matrix_homeserver),
 *     matrix_access_token = COALESCE(:matrixAccessToken, nc.matrix_access_token),
 *     matrix_room_id = COALESCE(:matrixRoomId, nc.matrix_room_id),
 *     discord_webhook_url = COALESCE(:discordWebhookUrl, nc.discord_webhook_url),
 *     lookahead_days = COALESCE(:lookaheadDays, nc.lookahead_days),
 *     notify_time = COALESCE(:notifyTime::time, nc.notify_time),
 *     updated_at = current_timestamp
 * FROM auth.users u
 * WHERE nc.external_id = :channelExternalId::uuid
 *   AND nc.user_id = u.id
 *   AND u.external_id = :userExternalId::uuid
 * RETURNING
 *     nc.external_id,
 *     nc.platform,
 *     nc.is_enabled,
 *     nc.telegram_bot_token,
 *     nc.telegram_chat_id,
 *     nc.matrix_homeserver,
 *     nc.matrix_access_token,
 *     nc.matrix_room_id,
 *     nc.discord_webhook_url,
 *     nc.lookahead_days,
 *     nc.notify_time,
 *     nc.last_notified_date,
 *     nc.created_at,
 *     nc.updated_at
 * ```
 */
export const updateChannel = new PreparedQuery<IUpdateChannelParams,IUpdateChannelResult>(updateChannelIR);


/** 'DeleteChannel' parameters type */
export interface IDeleteChannelParams {
  channelExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteChannel' return type */
export interface IDeleteChannelResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteChannel' query type */
export interface IDeleteChannelQuery {
  params: IDeleteChannelParams;
  result: IDeleteChannelResult;
}

const deleteChannelIR: any = {"usedParamSet":{"channelExternalId":true,"userExternalId":true},"params":[{"name":"channelExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":103}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":171}]}],"statement":"DELETE FROM system.notification_channels nc\nUSING auth.users u\nWHERE nc.external_id = :channelExternalId::uuid\n  AND nc.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\nRETURNING nc.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM system.notification_channels nc
 * USING auth.users u
 * WHERE nc.external_id = :channelExternalId::uuid
 *   AND nc.user_id = u.id
 *   AND u.external_id = :userExternalId::uuid
 * RETURNING nc.external_id
 * ```
 */
export const deleteChannel = new PreparedQuery<IDeleteChannelParams,IDeleteChannelResult>(deleteChannelIR);


/** 'GetEnabledChannelsDueAt' parameters type */
export interface IGetEnabledChannelsDueAtParams {
  notifyTime?: DateOrString | null | void;
  today?: DateOrString | null | void;
}

/** 'GetEnabledChannelsDueAt' return type */
export interface IGetEnabledChannelsDueAtResult {
  /** Discord webhook URL */
  discord_webhook_url: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Internal sequential ID (never expose in API) */
  id: number;
  /** Number of days to look ahead for upcoming dates */
  lookahead_days: number;
  /** Matrix access token */
  matrix_access_token: string | null;
  /** Matrix homeserver URL */
  matrix_homeserver: string | null;
  /** Matrix room ID */
  matrix_room_id: string | null;
  /** Messaging platform type */
  platform: string;
  /** Telegram bot token from BotFather */
  telegram_bot_token: string | null;
  /** Telegram chat ID for message delivery */
  telegram_chat_id: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  user_external_id: string;
  user_language: string | null;
}

/** 'GetEnabledChannelsDueAt' query type */
export interface IGetEnabledChannelsDueAtQuery {
  params: IGetEnabledChannelsDueAtParams;
  result: IGetEnabledChannelsDueAtResult;
}

const getEnabledChannelsDueAtIR: any = {"usedParamSet":{"notifyTime":true,"today":true},"params":[{"name":"notifyTime","required":false,"transform":{"type":"scalar"},"locs":[{"a":470,"b":480}]},{"name":"today","required":false,"transform":{"type":"scalar"},"locs":[{"a":552,"b":557}]}],"statement":"SELECT\n    nc.id,\n    nc.external_id,\n    nc.platform,\n    nc.telegram_bot_token,\n    nc.telegram_chat_id,\n    nc.matrix_homeserver,\n    nc.matrix_access_token,\n    nc.matrix_room_id,\n    nc.discord_webhook_url,\n    nc.lookahead_days,\n    u.external_id AS user_external_id,\n    COALESCE(u.preferences->>'language', 'en') AS user_language\nFROM system.notification_channels nc\nINNER JOIN auth.users u ON nc.user_id = u.id\nWHERE nc.is_enabled = true\n  AND nc.notify_time = :notifyTime::time\n  AND (nc.last_notified_date IS NULL OR nc.last_notified_date < :today::date)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     nc.id,
 *     nc.external_id,
 *     nc.platform,
 *     nc.telegram_bot_token,
 *     nc.telegram_chat_id,
 *     nc.matrix_homeserver,
 *     nc.matrix_access_token,
 *     nc.matrix_room_id,
 *     nc.discord_webhook_url,
 *     nc.lookahead_days,
 *     u.external_id AS user_external_id,
 *     COALESCE(u.preferences->>'language', 'en') AS user_language
 * FROM system.notification_channels nc
 * INNER JOIN auth.users u ON nc.user_id = u.id
 * WHERE nc.is_enabled = true
 *   AND nc.notify_time = :notifyTime::time
 *   AND (nc.last_notified_date IS NULL OR nc.last_notified_date < :today::date)
 * ```
 */
export const getEnabledChannelsDueAt = new PreparedQuery<IGetEnabledChannelsDueAtParams,IGetEnabledChannelsDueAtResult>(getEnabledChannelsDueAtIR);


/** 'MarkChannelNotified' parameters type */
export interface IMarkChannelNotifiedParams {
  channelId?: number | null | void;
  today?: DateOrString | null | void;
}

/** 'MarkChannelNotified' return type */
export type IMarkChannelNotifiedResult = void;

/** 'MarkChannelNotified' query type */
export interface IMarkChannelNotifiedQuery {
  params: IMarkChannelNotifiedParams;
  result: IMarkChannelNotifiedResult;
}

const markChannelNotifiedIR: any = {"usedParamSet":{"today":true,"channelId":true},"params":[{"name":"today","required":false,"transform":{"type":"scalar"},"locs":[{"a":61,"b":66},{"a":154,"b":159}]},{"name":"channelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":85,"b":94}]}],"statement":"UPDATE system.notification_channels\nSET last_notified_date = :today::date\nWHERE id = :channelId\n  AND (last_notified_date IS NULL OR last_notified_date < :today::date)"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE system.notification_channels
 * SET last_notified_date = :today::date
 * WHERE id = :channelId
 *   AND (last_notified_date IS NULL OR last_notified_date < :today::date)
 * ```
 */
export const markChannelNotified = new PreparedQuery<IMarkChannelNotifiedParams,IMarkChannelNotifiedResult>(markChannelNotifiedIR);


