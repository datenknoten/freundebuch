import type * as Sentry from '@sentry/node';
import { redactBotToken } from './redact-bot-token.js';
import { redactUrlAttributes } from './redact-url-attributes.js';
import { scrubBreadcrumb } from './scrub-breadcrumb.js';
import { SENSITIVE_LOG_KEYS } from './sensitive-log-keys.js';

/**
 * `beforeSend` runs for error events only; the transaction hook never sees
 * them. Covers the same three carriers a captured exception has: the trace
 * context it inherits, its own request URL, and the breadcrumb trail.
 */
export function scrubErrorEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  redactUrlAttributes(event.contexts?.trace?.data);

  if (typeof event.request?.url === 'string') {
    event.request.url = redactBotToken(event.request.url);
  }

  for (const crumb of event.breadcrumbs ?? []) {
    scrubBreadcrumb(crumb);
  }

  if (event.extra !== undefined) {
    for (const key of SENSITIVE_LOG_KEYS) {
      if (key in event.extra) {
        delete event.extra[key];
      }
    }
  }

  return event;
}
