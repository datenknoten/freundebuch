import { ValidationError } from '@datenknoten/kit';
import { Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ExternalServiceError } from '../errors/external-service.error.js';
import type { AppContext } from '../types/context.js';

// Cap the forwarded envelope size — this endpoint is unauthenticated.
const MAX_ENVELOPE_BYTES = 1_000_000; // 1 MB

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

export interface SentryTunnelRoutesOptions {
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createSentryTunnelRoutes(options: SentryTunnelRoutesOptions) {
  const { rateLimitMiddleware } = options;
  const sentryTunnelRoutes = new Hono<AppContext>();

  /**
   * Sentry tunnel endpoint that proxies Sentry events from the frontend
   * This allows the frontend to send events without exposing the Sentry DSN
   * and avoids ad blockers that block direct Sentry requests
   */
  sentryTunnelRoutes.post(
    '/',
    rateLimitMiddleware,
    bodyLimit({
      maxSize: MAX_ENVELOPE_BYTES,
      onError: (c) => c.json({ error: 'Envelope too large' }, 413),
    }),
    async (c) => {
      const logger = c.get('logger');
      const envelope = await c.req.text();
      const [headerLine = ''] = envelope.split('\n');

      let header: { dsn?: string };
      try {
        header = JSON.parse(headerLine);
      } catch {
        throw new ValidationError('Invalid envelope header');
      }

      if (!header.dsn || typeof header.dsn !== 'string') {
        throw new ValidationError('Missing or invalid DSN');
      }

      let dsn: URL;
      try {
        dsn = new URL(header.dsn);
      } catch {
        throw new ValidationError('Invalid DSN URL');
      }

      // SECURITY: Validate that the DSN host is an allowed Sentry domain
      // This prevents SSRF attacks where an attacker could make the server
      // send requests to arbitrary URLs
      if (!isAllowedSentryHost(dsn.host)) {
        logger.warn({ host: dsn.host }, 'Rejected Sentry tunnel request to non-allowed host');
        throw new ValidationError('Invalid Sentry host');
      }

      const projectId = dsn.pathname.replace('/', '');
      if (!projectId || !/^\d+$/.test(projectId)) {
        throw new ValidationError('Invalid project ID');
      }

      const sentryIngestUrl = `https://${dsn.host}/api/${projectId}/envelope/`;

      let response: Response;
      try {
        response = await fetch(sentryIngestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-sentry-envelope',
          },
          body: envelope,
        });
      } catch {
        throw new ExternalServiceError('Sentry', 'Failed to tunnel Sentry request');
      }

      if (response.ok) {
        return c.json({ success: true }, 200);
      }

      // Pass an upstream 4xx through as-is (preserving e.g. 429 rate limiting),
      // and collapse upstream 5xx to 502 (a bad-gateway from our perspective).
      logger.warn({ upstreamStatus: response.status }, 'Sentry upstream rejected envelope');
      const status: ContentfulStatusCode =
        response.status >= 500 ? 502 : (response.status as ContentfulStatusCode);
      return c.json({ success: false, error: 'Sentry rejected the envelope' }, status);
    },
  );

  return sentryTunnelRoutes;
}
