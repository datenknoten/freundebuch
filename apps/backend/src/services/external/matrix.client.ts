import dns from 'node:dns';
import { NotificationDeliveryError, ValidationError } from '../../utils/errors.js';
import { isPrivateAddress } from '../../utils/security.js';

/**
 * Validate that a homeserver URL points to a public address.
 *
 * The lexical checks alone were bypassable: a public hostname (or a wildcard
 * DNS service like nip.io) can resolve to a loopback or RFC-1918 address, so
 * the name is resolved and every returned address is checked. A resolver that
 * answers differently on the subsequent connect is still possible in theory
 * (DNS rebinding); the token is scoped to the user's own homeserver, so the
 * remaining exposure is a request without a useful response channel.
 */
async function assertPublicHomeserver(homeserver: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(homeserver);
  } catch {
    throw new ValidationError('Invalid homeserver URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new ValidationError('Homeserver URL must use https');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|]$/g, '');

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new ValidationError('Homeserver URL must be a public address');
  }

  if (isPrivateAddress(hostname)) {
    throw new ValidationError('Homeserver URL must be a public address');
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new ValidationError('Homeserver hostname does not resolve');
  }

  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new ValidationError('Homeserver URL must be a public address');
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
  await assertPublicHomeserver(homeserver);

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
    // The SSRF guard above checked the first hop only; following a redirect
    // would carry the access token to an unchecked target. A 3xx now fails the
    // `response.ok` check below and turns into a delivery error.
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new NotificationDeliveryError('Matrix', errorText, response.status);
  }
}
