import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import type { AppContext } from '../types/context.js';

const sentryTunnelRoutes = new Hono<AppContext>();

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
    const header = JSON.parse(pieces[0]);
    const dsn = new URL(header.dsn);

    // Construct the Sentry ingest URL
    const projectId = dsn.pathname.replace('/', '');
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Sentry tunnel error');
    Sentry.captureException(err);
    return c.json({ error: 'Failed to tunnel Sentry request' }, 500);
  }
});

export default sentryTunnelRoutes;
