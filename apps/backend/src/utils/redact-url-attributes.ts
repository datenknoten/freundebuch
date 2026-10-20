import { redactBotToken } from './redact-bot-token.js';

const URL_ATTRIBUTES = ['http.url', 'url'];

export function redactUrlAttributes(data: Record<string, unknown> | undefined): void {
  if (data === undefined) {
    return;
  }
  for (const key of URL_ATTRIBUTES) {
    const value = data[key];
    if (typeof value === 'string') {
      data[key] = redactBotToken(value);
    }
  }
}
