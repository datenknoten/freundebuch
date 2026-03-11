/** Types generated for queries found in "src/models/queries/notification-channels.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetChannelsByUserId' parameters type */
export interface IGetChannelsByUserIdParams {
  userExternalId?: string | null | void;
}

/** 'GetChannelsByUserId' return type */
export interface IGetChannelsByUserIdResult {
  created_at: Date;
  discord_webhook_url: string | null;
  external_id: string;
  is_enabled: boolean;
  last_notified_date: Date | null;
  lookahead_days: number;
  matrix_access_token: string | null;
  matrix_homeserver: string | null;
  matrix_room_id: string | null;
  notify_time: string;
  platform: string;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  updated_at: Date;
}

/** 'GetChannelsByUserId' query type */
export interface IGetChannelsByUserIdQuery {
  params: IGetChannelsByUserIdParams;
  result: IGetChannelsByUserIdResult;
}

const getChannelsByUserIdIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":0,"b":14}]}],"statement":"SELECT nc.external_id, nc.platform, nc.is_enabled, nc.telegram_bot_token, nc.telegram_chat_id, nc.matrix_homeserver, nc.matrix_access_token, nc.matrix_room_id, nc.discord_webhook_url, nc.lookahead_days, nc.notify_time, nc.last_notified_date, nc.created_at, nc.updated_at FROM system.notification_channels nc INNER JOIN auth.users u ON nc.user_id = u.id WHERE u.external_id = :userExternalId::uuid ORDER BY nc.created_at ASC"};

export const getChannelsByUserId = new PreparedQuery<IGetChannelsByUserIdParams,IGetChannelsByUserIdResult>(getChannelsByUserIdIR);


/** 'GetChannelByExternalId' parameters type */
export interface IGetChannelByExternalIdParams {
  channelExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetChannelByExternalId' return type */
export interface IGetChannelByExternalIdResult {
  created_at: Date;
  discord_webhook_url: string | null;
  external_id: string;
  is_enabled: boolean;
  last_notified_date: Date | null;
  lookahead_days: number;
  matrix_access_token: string | null;
  matrix_homeserver: string | null;
  matrix_room_id: string | null;
  notify_time: string;
  platform: string;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  updated_at: Date;
}

/** 'GetChannelByExternalId' query type */
export interface IGetChannelByExternalIdQuery {
  params: IGetChannelByExternalIdParams;
  result: IGetChannelByExternalIdResult;
}

const getChannelByExternalIdIR: any = {"usedParamSet":{"channelExternalId":true,"userExternalId":true},"params":[{"name":"channelExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":0,"b":17}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":18,"b":32}]}],"statement":"SELECT nc.external_id, nc.platform, nc.is_enabled, nc.telegram_bot_token, nc.telegram_chat_id, nc.matrix_homeserver, nc.matrix_access_token, nc.matrix_room_id, nc.discord_webhook_url, nc.lookahead_days, nc.notify_time, nc.last_notified_date, nc.created_at, nc.updated_at FROM system.notification_channels nc INNER JOIN auth.users u ON nc.user_id = u.id WHERE nc.external_id = :channelExternalId::uuid AND u.external_id = :userExternalId::uuid"};

export const getChannelByExternalId = new PreparedQuery<IGetChannelByExternalIdParams,IGetChannelByExternalIdResult>(getChannelByExternalIdIR);


/** 'CreateChannel' parameters type */
export interface ICreateChannelParams {
  discordWebhookUrl?: string | null | void;
  isEnabled?: boolean | null | void;
  lookaheadDays?: number | null | void;
  matrixAccessToken?: string | null | void;
  matrixHomeserver?: string | null | void;
  matrixRoomId?: string | null | void;
  notifyTime?: string | null | void;
  platform?: string | null | void;
  telegramBotToken?: string | null | void;
  telegramChatId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateChannel' return type */
export interface ICreateChannelResult {
  created_at: Date;
  discord_webhook_url: string | null;
  external_id: string;
  is_enabled: boolean;
  last_notified_date: Date | null;
  lookahead_days: number;
  matrix_access_token: string | null;
  matrix_homeserver: string | null;
  matrix_room_id: string | null;
  notify_time: string;
  platform: string;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  updated_at: Date;
}

/** 'CreateChannel' query type */
export interface ICreateChannelQuery {
  params: ICreateChannelParams;
  result: ICreateChannelResult;
}

const createChannelIR: any = {"usedParamSet":{"platform":true,"isEnabled":true,"telegramBotToken":true,"telegramChatId":true,"matrixHomeserver":true,"matrixAccessToken":true,"matrixRoomId":true,"discordWebhookUrl":true,"lookaheadDays":true,"notifyTime":true,"userExternalId":true},"params":[{"name":"platform","required":false,"transform":{"type":"scalar"},"locs":[{"a":0,"b":8}]},{"name":"isEnabled","required":false,"transform":{"type":"scalar"},"locs":[{"a":9,"b":18}]},{"name":"telegramBotToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":19,"b":35}]},{"name":"telegramChatId","required":false,"transform":{"type":"scalar"},"locs":[{"a":36,"b":50}]},{"name":"matrixHomeserver","required":false,"transform":{"type":"scalar"},"locs":[{"a":51,"b":67}]},{"name":"matrixAccessToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":68,"b":85}]},{"name":"matrixRoomId","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":98}]},{"name":"discordWebhookUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":116}]},{"name":"lookaheadDays","required":false,"transform":{"type":"scalar"},"locs":[{"a":117,"b":130}]},{"name":"notifyTime","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":141}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":142,"b":156}]}],"statement":"INSERT INTO system.notification_channels (user_id, platform, is_enabled, telegram_bot_token, telegram_chat_id, matrix_homeserver, matrix_access_token, matrix_room_id, discord_webhook_url, lookahead_days, notify_time) SELECT u.id, :platform, COALESCE(:isEnabled, true), :telegramBotToken, :telegramChatId, :matrixHomeserver, :matrixAccessToken, :matrixRoomId, :discordWebhookUrl, COALESCE(:lookaheadDays, 7), COALESCE(:notifyTime::time, '08:00:00'::time) FROM auth.users u WHERE u.external_id = :userExternalId::uuid RETURNING external_id, platform, is_enabled, telegram_bot_token, telegram_chat_id, matrix_homeserver, matrix_access_token, matrix_room_id, discord_webhook_url, lookahead_days, notify_time, last_notified_date, created_at, updated_at"};

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
  notifyTime?: string | null | void;
  telegramBotToken?: string | null | void;
  telegramChatId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateChannel' return type */
export interface IUpdateChannelResult {
  created_at: Date;
  discord_webhook_url: string | null;
  external_id: string;
  is_enabled: boolean;
  last_notified_date: Date | null;
  lookahead_days: number;
  matrix_access_token: string | null;
  matrix_homeserver: string | null;
  matrix_room_id: string | null;
  notify_time: string;
  platform: string;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  updated_at: Date;
}

/** 'UpdateChannel' query type */
export interface IUpdateChannelQuery {
  params: IUpdateChannelParams;
  result: IUpdateChannelResult;
}

const updateChannelIR: any = {"usedParamSet":{"isEnabled":true,"telegramBotToken":true,"telegramChatId":true,"matrixHomeserver":true,"matrixAccessToken":true,"matrixRoomId":true,"discordWebhookUrl":true,"lookaheadDays":true,"notifyTime":true,"channelExternalId":true,"userExternalId":true},"params":[{"name":"isEnabled","required":false,"transform":{"type":"scalar"},"locs":[{"a":0,"b":9}]},{"name":"telegramBotToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":10,"b":26}]},{"name":"telegramChatId","required":false,"transform":{"type":"scalar"},"locs":[{"a":27,"b":41}]},{"name":"matrixHomeserver","required":false,"transform":{"type":"scalar"},"locs":[{"a":42,"b":58}]},{"name":"matrixAccessToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":59,"b":76}]},{"name":"matrixRoomId","required":false,"transform":{"type":"scalar"},"locs":[{"a":77,"b":89}]},{"name":"discordWebhookUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":90,"b":107}]},{"name":"lookaheadDays","required":false,"transform":{"type":"scalar"},"locs":[{"a":108,"b":121}]},{"name":"notifyTime","required":false,"transform":{"type":"scalar"},"locs":[{"a":122,"b":132}]},{"name":"channelExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":133,"b":150}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":151,"b":165}]}],"statement":"UPDATE system.notification_channels nc SET is_enabled = COALESCE(:isEnabled, nc.is_enabled), telegram_bot_token = COALESCE(:telegramBotToken, nc.telegram_bot_token), telegram_chat_id = COALESCE(:telegramChatId, nc.telegram_chat_id), matrix_homeserver = COALESCE(:matrixHomeserver, nc.matrix_homeserver), matrix_access_token = COALESCE(:matrixAccessToken, nc.matrix_access_token), matrix_room_id = COALESCE(:matrixRoomId, nc.matrix_room_id), discord_webhook_url = COALESCE(:discordWebhookUrl, nc.discord_webhook_url), lookahead_days = COALESCE(:lookaheadDays, nc.lookahead_days), notify_time = COALESCE(:notifyTime::time, nc.notify_time), updated_at = current_timestamp FROM auth.users u WHERE nc.external_id = :channelExternalId::uuid AND nc.user_id = u.id AND u.external_id = :userExternalId::uuid RETURNING nc.external_id, nc.platform, nc.is_enabled, nc.telegram_bot_token, nc.telegram_chat_id, nc.matrix_homeserver, nc.matrix_access_token, nc.matrix_room_id, nc.discord_webhook_url, nc.lookahead_days, nc.notify_time, nc.last_notified_date, nc.created_at, nc.updated_at"};

export const updateChannel = new PreparedQuery<IUpdateChannelParams,IUpdateChannelResult>(updateChannelIR);


/** 'DeleteChannel' parameters type */
export interface IDeleteChannelParams {
  channelExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteChannel' return type */
export interface IDeleteChannelResult {
  external_id: string;
}

/** 'DeleteChannel' query type */
export interface IDeleteChannelQuery {
  params: IDeleteChannelParams;
  result: IDeleteChannelResult;
}

const deleteChannelIR: any = {"usedParamSet":{"channelExternalId":true,"userExternalId":true},"params":[{"name":"channelExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":0,"b":17}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":18,"b":32}]}],"statement":"DELETE FROM system.notification_channels nc USING auth.users u WHERE nc.external_id = :channelExternalId::uuid AND nc.user_id = u.id AND u.external_id = :userExternalId::uuid RETURNING nc.external_id"};

export const deleteChannel = new PreparedQuery<IDeleteChannelParams,IDeleteChannelResult>(deleteChannelIR);


/** 'GetEnabledChannelsDueAt' parameters type */
export interface IGetEnabledChannelsDueAtParams {
  notifyTime?: string | null | void;
  today?: string | null | void;
}

/** 'GetEnabledChannelsDueAt' return type */
export interface IGetEnabledChannelsDueAtResult {
  discord_webhook_url: string | null;
  external_id: string;
  id: number;
  lookahead_days: number;
  matrix_access_token: string | null;
  matrix_homeserver: string | null;
  matrix_room_id: string | null;
  platform: string;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  user_external_id: string;
  user_language: string | null;
}

/** 'GetEnabledChannelsDueAt' query type */
export interface IGetEnabledChannelsDueAtQuery {
  params: IGetEnabledChannelsDueAtParams;
  result: IGetEnabledChannelsDueAtResult;
}

const getEnabledChannelsDueAtIR: any = {"usedParamSet":{"notifyTime":true,"today":true},"params":[{"name":"notifyTime","required":false,"transform":{"type":"scalar"},"locs":[{"a":0,"b":10}]},{"name":"today","required":false,"transform":{"type":"scalar"},"locs":[{"a":11,"b":16}]}],"statement":"SELECT nc.id, nc.external_id, nc.platform, nc.telegram_bot_token, nc.telegram_chat_id, nc.matrix_homeserver, nc.matrix_access_token, nc.matrix_room_id, nc.discord_webhook_url, nc.lookahead_days, u.external_id AS user_external_id, COALESCE(u.preferences->>'language', 'en') AS user_language FROM system.notification_channels nc INNER JOIN auth.users u ON nc.user_id = u.id WHERE nc.is_enabled = true AND nc.notify_time = :notifyTime::time AND (nc.last_notified_date IS NULL OR nc.last_notified_date < :today::date)"};

export const getEnabledChannelsDueAt = new PreparedQuery<IGetEnabledChannelsDueAtParams,IGetEnabledChannelsDueAtResult>(getEnabledChannelsDueAtIR);


/** 'MarkChannelNotified' parameters type */
export interface IMarkChannelNotifiedParams {
  channelId?: number | null | void;
  today?: string | null | void;
}

/** 'MarkChannelNotified' return type */
export type IMarkChannelNotifiedResult = void;

/** 'MarkChannelNotified' query type */
export interface IMarkChannelNotifiedQuery {
  params: IMarkChannelNotifiedParams;
  result: IMarkChannelNotifiedResult;
}

const markChannelNotifiedIR: any = {"usedParamSet":{"today":true,"channelId":true},"params":[{"name":"today","required":false,"transform":{"type":"scalar"},"locs":[{"a":0,"b":5}]},{"name":"channelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":6,"b":15}]}],"statement":"UPDATE system.notification_channels SET last_notified_date = :today::date WHERE id = :channelId AND (last_notified_date IS NULL OR last_notified_date < :today::date)"};

export const markChannelNotified = new PreparedQuery<IMarkChannelNotifiedParams,IMarkChannelNotifiedResult>(markChannelNotifiedIR);
