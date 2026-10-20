import * as Sentry from '@sentry/sveltekit';
import { browser, dev } from '$app/environment';
import { configureApiBaseUrl } from '$lib/api/client.js';
import { configureAuthClient } from '$lib/auth-client.js';
import { type ClientConfig, loadClientConfig } from '$lib/config.js';

function initSentry(dsn: string) {
  Sentry.init({
    dsn,
    environment: dev === true ? 'development' : 'production',
    release: __APP_VERSION__,

    // Tunnel Sentry requests through the backend to avoid ad blockers
    // and keep the DSN hidden from client-side code inspection
    tunnel: '/api/sentry-tunnel',

    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration({
        instrumentNavigation: true,
        instrumentPageLoad: true,
      }),
    ],

    // Adds sentry-trace and baggage headers to these outgoing requests for distributed tracing
    tracePropagationTargets: [
      // Same origin: production serves frontend and backend on one domain
      /^\/api\//,
      /^http:\/\/localhost:3000/,
      /^http:\/\/localhost:5173\/api/,
    ],
  });
}

function configureClient(config: ClientConfig) {
  configureApiBaseUrl(config.PUBLIC_API_URL);
  configureAuthClient(config.PUBLIC_API_URL);
  // The root load reruns on invalidation, while Sentry must start once per page lifetime.
  if (
    browser === true &&
    config.PUBLIC_SENTRY_DSN !== undefined &&
    Sentry.isInitialized() === false
  ) {
    initSentry(config.PUBLIC_SENTRY_DSN);
  }
}

export function load() {
  const config = loadClientConfig();
  configureClient(config);
  return { config };
}
