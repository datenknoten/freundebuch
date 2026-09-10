import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { LOG_REDACT_PATHS } from '../../src/utils/logger.js';

/**
 * The redaction list is a security control, so it is tested through pino
 * itself rather than by asserting on the array: the question is what ends up
 * in the log line, and pino's path syntax (single vs. double wildcard, bracket
 * forms) is where the mistakes are.
 */
function logOnce(payload: Record<string, unknown>): Record<string, unknown> {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });

  const logger = pino({ level: 'info', redact: { paths: LOG_REDACT_PATHS } }, destination);
  logger.info(payload);

  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0]) as Record<string, unknown>;
}

describe('LOG_REDACT_PATHS', () => {
  it('is accepted by pino', () => {
    expect(() => logOnce({ msg: 'ok' })).not.toThrow();
  });

  it('redacts credentials one level down', () => {
    const line = logOnce({
      smtp: { password: 'hunter2' },
      session: { token: 'abc' },
      channel: { botToken: '123:ABC' },
    });

    expect(line.smtp).toEqual({ password: '[Redacted]' });
    expect(line.session).toEqual({ token: '[Redacted]' });
    expect(line.channel).toEqual({ botToken: '[Redacted]' });
  });

  it('redacts credentials two levels down', () => {
    const line = logOnce({ request: { body: { password: 'hunter2', token: 'abc' } } });

    expect(line.request).toEqual({ body: { password: '[Redacted]', token: '[Redacted]' } });
  });

  it('redacts PII at the top level and nested', () => {
    const line = logOnce({
      email: 'a@example.com',
      friend: { displayName: 'Alice', address: 'Somewhere 1' },
      friends: [{ email: 'b@example.com' }],
    });

    expect(line.email).toBe('[Redacted]');
    expect(line.friend).toEqual({ displayName: '[Redacted]', address: '[Redacted]' });
    expect(line.friends).toEqual([{ email: '[Redacted]' }]);
  });

  it('redacts cookies and authorization headers', () => {
    const line = logOnce({
      cookie: 'session=1',
      'set-cookie': 'session=1; HttpOnly',
      headers: {
        authorization: 'Bearer x',
        cookie: 'session=1',
        'set-cookie': 'session=1; HttpOnly',
      },
    });

    expect(line.cookie).toBe('[Redacted]');
    expect(line['set-cookie']).toBe('[Redacted]');
    expect(line.headers).toEqual({
      authorization: '[Redacted]',
      cookie: '[Redacted]',
      'set-cookie': '[Redacted]',
    });
  });

  /**
   * The no-SMTP recovery path: lib/auth.ts logs these at debug level only when
   * ENV !== 'production', and docs/self-hosting.md tells the operator to read
   * the link out of the log. Redacting them left an instance without mail with
   * no way to reset a password.
   */
  it('keeps the dev-only reset and verification links readable', () => {
    const line = logOnce({
      resetUrl: 'https://example.com/reset-password?token=abc',
      verificationUrl: 'https://example.com/verify-email?token=def',
    });

    expect(line.resetUrl).toBe('https://example.com/reset-password?token=abc');
    expect(line.verificationUrl).toBe('https://example.com/verify-email?token=def');
  });
});
