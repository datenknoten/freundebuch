import { NotificationDeliveryError } from '../../errors/notification-delivery.error.js';

export async function sendDiscordMessage(webhookUrl: string, content: string) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(10_000),
  });

  if (response.ok === false) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new NotificationDeliveryError('Discord', errorText, response.status);
  }
}
