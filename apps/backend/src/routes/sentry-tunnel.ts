import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import type { AppContext } from '../types/context.js';
import { toError } from '../utils/errors.js';

const sentryTunnelRoutes = new Hono<AppContext>();

/**
 * Allowed Sentry ingest hosts to prevent SSRF attacks.
 * Only requests to official Sentry domains are forwarded.
 */
const ALLOWED_SENTRY_HOST_SUFFIXES = [
  '.ingest.sentry.io',
  '.ingest.us.sentry.io',
  '.ingest.de.sentry.io',
];

/**
 * Validates that a hostname is an allowed Sentry ingest host.
 * Prevents SSRF by ensuring we only forward requests to Sentry's servers.
 */
function isAllowedSentryHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return ALLOWED_SENTRY_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix));
}

/**
 * Sentry tunnel endpoint that proxies Sentry events from the frontend
 * This allows the frontend to send events without exposing the Sentry DSN
 * and avoids ad blockers that block direct Sentry requests
 */
sentryTunnelRoutes.post('/', async (c) => {
  const logger = c.get('logger');

  try {
    const envelope = await c.req.text();

    // Parse the envelope header to extract the DSN
    const pieces = envelope.split('\n');
    if (pieces.length === 0) {
      return c.json({ error: 'Invalid envelope format' }, 400);
    }

    let header: { dsn?: string };
    try {
      header = JSON.parse(pieces[0]);
    } catch {
      return c.json({ error: 'Invalid envelope header' }, 400);
    }

    if (!header.dsn || typeof header.dsn !== 'string') {
      return c.json({ error: 'Missing or invalid DSN' }, 400);
    }

    let dsn: URL;
    try {
      dsn = new URL(header.dsn);
    } catch {
      return c.json({ error: 'Invalid DSN URL' }, 400);
    }

    // SECURITY: Validate that the DSN host is an allowed Sentry domain
    // This prevents SSRF attacks where an attacker could make the server
    // send requests to arbitrary URLs
    if (!isAllowedSentryHost(dsn.host)) {
      logger.warn({ host: dsn.host }, 'Rejected Sentry tunnel request to non-allowed host');
      return c.json({ error: 'Invalid Sentry host' }, 400);
    }

    // Construct the Sentry ingest URL
    const projectId = dsn.pathname.replace('/', '');
    if (!projectId || !/^\d+$/.test(projectId)) {
      return c.json({ error: 'Invalid project ID' }, 400);
    }

    const sentryIngestUrl = `https://${dsn.host}/api/${projectId}/envelope/`;

    // Forward the request to Sentry
    const response = await fetch(sentryIngestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: envelope,
    });

    return c.json({ success: true }, response.status as 200 | 400 | 500);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Sentry tunnel error');
    Sentry.captureException(err);
    return c.json({ error: 'Failed to tunnel Sentry request' }, 500);
  }
});

export default sentryTunnelRoutes;
