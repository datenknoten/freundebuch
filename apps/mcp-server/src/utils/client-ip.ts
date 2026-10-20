import type { IncomingMessage } from 'node:http';

export function getClientIp(req: IncomingMessage) {
  // Trust order matters: nginx sets `X-Real-IP` to `$remote_addr` (the trusted
  // upstream hop), and `X-Forwarded-For` via `$proxy_add_x_forwarded_for` which
  // *appends* the trusted source to whatever the client sent. So the first XFF
  // entry is client-supplied and spoofable; the trustworthy hop is the last one.
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    const trimmed = realIp.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const hops = forwarded
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const lastHop = hops.at(-1);
    if (lastHop !== undefined) {
      return lastHop;
    }
  }

  return req.socket.remoteAddress ?? 'unknown';
}
