import * as Sentry from '@sentry/node';
import type { Context, Next } from 'hono';
import type { AppContext } from '../types/context.js';

// Routes that should not be traced to avoid noise and recursive tracing
const EXCLUDED_TRACE_PATHS = ['/api/sentry-tunnel', '/health'];

/**
 * Continues the distributed trace from the frontend (sentry-trace, baggage
 * headers) and wraps the request in an `http.server` span.
 */
export async function sentryTracingMiddleware(c: Context<AppContext>, next: Next) {
  // Skip tracing for excluded paths (e.g., sentry-tunnel to avoid recursive traces)
  if (EXCLUDED_TRACE_PATHS.includes(c.req.path) === true) {
    return next();
  }

  const sentryTraceHeader = c.req.header('sentry-trace') ?? '';
  const baggageHeader = c.req.header('baggage') ?? '';

  async function runInSpan(span: Sentry.Span) {
    try {
      await next();

      const status = c.res.status;
      span.setAttribute('http.status_code', status);

      if (status >= 400) {
        span.setStatus({ code: 2 }); // ERROR
      } else {
        span.setStatus({ code: 1 }); // OK
      }
    } catch (error) {
      // Mark the span as failed, but do NOT capture here — the global
      // onError handler is the single capture point, so capturing here
      // too would double-report every error and flag every expected 4xx.
      span.setStatus({ code: 2 }); // ERROR
      span.setAttribute('error', true);

      throw error;
    }
  }

  function traceRequest() {
    const routePath = c.req.routePath;
    return Sentry.startSpan(
      {
        name: `${c.req.method} ${c.req.path}`,
        op: 'http.server',
        attributes: {
          'http.method': c.req.method,
          'http.url': c.req.url,
          'http.route': routePath === '' ? c.req.path : routePath,
        },
      },
      runInSpan,
    );
  }

  return Sentry.continueTrace(
    {
      sentryTrace: sentryTraceHeader,
      baggage: baggageHeader,
    },
    traceRequest,
  );
}
