import { NotificationDeliveryError } from '../../errors/notification-delivery.error.js';

export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (response.ok === false) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new NotificationDeliveryError('Telegram', errorText, response.status);
  }
}
