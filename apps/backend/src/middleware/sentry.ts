import * as Sentry from '@sentry/node';
import type { MiddlewareHandler } from 'hono';
import type { AppContext } from '../types/context.js';

// Routes that should not be traced to avoid noise and recursive tracing
const EXCLUDED_TRACE_PATHS = ['/api/sentry-tunnel'];

/**
 * Sentry tracing middleware for Hono
 *
 * This middleware:
 * 1. Extracts trace context from incoming request headers (sentry-trace, baggage)
 * 2. Continues the distributed trace from the frontend
 * 3. Creates a transaction span for the HTTP request
 * 4. Captures any errors and associates them with the trace
 */
export const sentryTracingMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  // Skip tracing for excluded paths (e.g., sentry-tunnel to avoid recursive traces)
  if (EXCLUDED_TRACE_PATHS.includes(c.req.path)) {
    return next();
  }

  const sentryTraceHeader = c.req.header('sentry-trace') || '';
  const baggageHeader = c.req.header('baggage') || '';

  // Continue the trace from incoming headers (if present from frontend)
  // This links frontend and backend traces together
  return Sentry.continueTrace(
    {
      sentryTrace: sentryTraceHeader,
      baggage: baggageHeader,
    },
    async () => {
      // Create a span for this HTTP request
      return Sentry.startSpan(
        {
          name: `${c.req.method} ${c.req.path}`,
          op: 'http.server',
          attributes: {
            'http.method': c.req.method,
            'http.url': c.req.url,
            'http.route': c.req.routePath || c.req.path,
          },
        },
        async (span) => {
          try {
            await next();

            // Update span with response status
            const status = c.res.status;
            span.setAttribute('http.status_code', status);

            if (status >= 400) {
              span.setStatus({ code: 2 }); // ERROR
            } else {
              span.setStatus({ code: 1 }); // OK
            }
          } catch (error) {
            // Capture exception with full trace context
            Sentry.captureException(error, {
              extra: {
                path: c.req.path,
                method: c.req.method,
                routePath: c.req.routePath,
              },
            });

            span.setStatus({ code: 2 }); // ERROR
            span.setAttribute('error', true);

            throw error;
          }
        },
      );
    },
  );
};
