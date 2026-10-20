import type * as Sentry from '@sentry/node';
import { redactBotToken } from './redact-bot-token.js';

/**
 * Breadcrumbs are attached to *error* events, which pass through neither
 * `beforeSendLog` nor `beforeSendTransaction`. Sentry's HTTP instrumentation
 * records every outgoing request as a breadcrumb, so an unrelated exception
 * captured after a Telegram delivery ships the bot token in
 * `data.url`.
 */
export function scrubBreadcrumb(crumb: Sentry.Breadcrumb) {
  const url = crumb.data?.url;
  if (typeof url === 'string' && crumb.data !== undefined) {
    crumb.data.url = redactBotToken(url);
  }
  if (typeof crumb.message === 'string') {
    crumb.message = redactBotToken(crumb.message);
  }
  return crumb;
}
