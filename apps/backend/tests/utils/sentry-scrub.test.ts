import type * as Sentry from '@sentry/node';
import { describe, expect, it } from 'vitest';
import {
  redactBotToken,
  SENSITIVE_LOG_KEYS,
  scrubBreadcrumb,
  scrubErrorEvent,
} from '../../src/instrument.js';

const TELEGRAM_URL = 'https://api.telegram.org/bot123456:AAHsecret/sendMessage';
const TELEGRAM_URL_REDACTED = 'https://api.telegram.org/bot[redacted]/sendMessage';

/**
 * Error events are built by Sentry, so the fixtures are deliberately partial:
 * even `contexts.trace` requires span/trace ids that say nothing about
 * scrubbing.
 */
function errorEvent(partial: Record<string, unknown>): Sentry.ErrorEvent {
  return partial as unknown as Sentry.ErrorEvent;
}

describe('redactBotToken', () => {
  it('replaces the bot token in a Telegram request path', () => {
    expect(redactBotToken(TELEGRAM_URL)).toBe(TELEGRAM_URL_REDACTED);
  });

  it('leaves unrelated URLs alone', () => {
    expect(redactBotToken('https://example.com/robot/list')).toBe('https://example.com/robot/list');
  });
});

describe('scrubBreadcrumb', () => {
  it('redacts the token in an outgoing-http breadcrumb', () => {
    const crumb = scrubBreadcrumb({
      category: 'http',
      data: { url: TELEGRAM_URL, method: 'POST' },
    });

    expect(crumb.data).toEqual({ url: TELEGRAM_URL_REDACTED, method: 'POST' });
  });

  it('redacts the token in a breadcrumb message', () => {
    const crumb = scrubBreadcrumb({ message: `POST ${TELEGRAM_URL}` });

    expect(crumb.message).toBe(`POST ${TELEGRAM_URL_REDACTED}`);
  });

  it('passes a breadcrumb without data or message through', () => {
    expect(scrubBreadcrumb({ category: 'console' })).toEqual({ category: 'console' });
  });
});

describe('scrubErrorEvent', () => {
  /**
   * scheduler.ts captures delivery failures with Sentry.captureException; the
   * error event carries the auto-instrumented outgoing-http breadcrumb, which
   * neither beforeSendLog nor beforeSendTransaction ever sees.
   */
  it('redacts the token in breadcrumbs', () => {
    const event = scrubErrorEvent(
      errorEvent({ breadcrumbs: [{ category: 'http', data: { url: TELEGRAM_URL } }] }),
    );

    expect(event.breadcrumbs?.[0].data?.url).toBe(TELEGRAM_URL_REDACTED);
  });

  it('redacts the token in the inherited trace context', () => {
    const event = scrubErrorEvent(
      errorEvent({
        contexts: { trace: { data: { 'http.url': TELEGRAM_URL, url: TELEGRAM_URL } } },
      }),
    );

    expect(event.contexts?.trace?.data).toEqual({
      'http.url': TELEGRAM_URL_REDACTED,
      url: TELEGRAM_URL_REDACTED,
    });
  });

  it('redacts the token in the request url', () => {
    const event = scrubErrorEvent(errorEvent({ request: { url: TELEGRAM_URL } }));

    expect(event.request?.url).toBe(TELEGRAM_URL_REDACTED);
  });

  it('drops sensitive extras', () => {
    const event = scrubErrorEvent(
      errorEvent({ extra: { email: 'a@example.com', resetUrl: 'https://x/reset', friendId: 7 } }),
    );

    expect(event.extra).toEqual({ friendId: 7 });
    expect(SENSITIVE_LOG_KEYS).toContain('resetUrl');
  });

  it('handles an event with none of the carriers present', () => {
    expect(() => scrubErrorEvent(errorEvent({}))).not.toThrow();
  });
});
