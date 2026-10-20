export interface NotificationCredentials {
  // Telegram
  botToken?: string;
  chatId?: string;
  // Matrix
  homeserver?: string;
  accessToken?: string;
  roomId?: string;
  // Discord
  webhookUrl?: string;
}
