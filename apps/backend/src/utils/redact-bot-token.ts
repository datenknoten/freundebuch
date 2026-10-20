// Telegram puts the bot token in the request path
// (https://api.telegram.org/bot<token>/sendMessage), so the outgoing-HTTP spans
// carry it in their description and url attributes.
const BOT_TOKEN_IN_PATH = /\/bot[^/\s]+\//g;

export function redactBotToken(value: string): string {
  return value.replace(BOT_TOKEN_IN_PATH, '/bot[redacted]/');
}
