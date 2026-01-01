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

    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Session replay for debugging user issues
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [Sentry.replayIntegration()],
  });
}

export const handleError = Sentry.handleErrorWithSentry();
