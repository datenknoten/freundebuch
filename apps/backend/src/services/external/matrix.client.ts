import { NotificationDeliveryError, ValidationError } from '../../utils/errors.js';

/**
 * Validate that a homeserver URL points to a public address.
 * Blocks loopback, link-local, and RFC-1918 private ranges to prevent SSRF.
 */
function assertPublicHomeserver(homeserver: string): void {
  let parsed: URL;
  try {
    parsed = new URL(homeserver);
  } catch {
    throw new ValidationError('Invalid homeserver URL');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ValidationError('Homeserver URL must use http or https');
  }

  const hostname = parsed.hostname.toLowerCase();

  const blockedPatterns = [
    /^localhost$/,
    /^127\./,
    /^\[::1\]$/,
    /^0\.0\.0\.0$/,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^\[fc00:/i,
    /^\[fd/i,
    /^\[fe80:/i,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(hostname)) {
      throw new ValidationError('Homeserver URL must be a public address');
    }
  }
}

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
  assertPublicHomeserver(homeserver);

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
