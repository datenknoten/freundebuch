import { NotificationDeliveryError } from '../../utils/errors.js';

/**
 * Send a message via Matrix client API
 */
export async function sendMatrixMessage(
  homeserver: string,
  accessToken: string,
  roomId: string,
  text: string,
  html: string,
): Promise<void> {
  const txnId = `freundebuch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const encodedRoomId = encodeURIComponent(roomId);
  const url = `${homeserver}/_matrix/client/v3/rooms/${encodedRoomId}/send/m.room.message/${txnId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      msgtype: 'm.text',
      body: text,
      format: 'org.matrix.custom.html',
      formatted_body: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new NotificationDeliveryError('Matrix', errorText, response.status);
  }
}
