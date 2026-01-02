import * as Sentry from '@sentry/sveltekit';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: __APP_VERSION__,

    // Tunnel Sentry requests through the backend to avoid ad blockers
    // and keep the DSN hidden from client-side code inspection
    tunnel: '/api/sentry-tunnel',

    // Performance monitoring - 100% sampling for MVP phase
    tracesSampleRate: 1.0,

    // Session replay for debugging user issues
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration({
        // Enable fetch instrumentation for automatic trace propagation
        instrumentNavigation: true,
        instrumentPageLoad: true,
      }),
    ],

    // Propagate trace headers to the backend API for distributed tracing
    // This adds sentry-trace and baggage headers to outgoing fetch requests
    tracePropagationTargets: [
      // Same-origin requests (production - frontend and backend on same domain)
      /^\/api\//,
      // Local development
      /^http:\/\/localhost:3000/,
      /^http:\/\/localhost:5173\/api/,
    ],
  });
}

export const handleError = Sentry.handleErrorWithSentry();
