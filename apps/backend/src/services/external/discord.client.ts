import { NotificationDeliveryError } from '../../utils/errors.js';

/**
 * Send a message via Discord webhook
 */
export async function sendDiscordMessage(webhookUrl: string, content: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new NotificationDeliveryError('Discord', errorText, response.status);
  }
}
