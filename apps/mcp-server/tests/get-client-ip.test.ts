import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { getClientIp } from '../src/http-handler.js';

function makeReq(opts: {
  headers?: Record<string, string | string[]>;
  remoteAddress?: string;
}): IncomingMessage {
  return {
    headers: opts.headers ?? {},
    socket: { remoteAddress: opts.remoteAddress },
  } as unknown as IncomingMessage;
}

describe('getClientIp', () => {
  it('prefers X-Real-IP over X-Forwarded-For', () => {
    const req = makeReq({
      headers: {
        'x-real-ip': '10.0.0.1',
        'x-forwarded-for': '1.2.3.4, 10.0.0.1',
      },
      remoteAddress: '127.0.0.1',
    });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('returns the last X-Forwarded-For hop when X-Real-IP is absent', () => {
    // nginx appends $remote_addr via $proxy_add_x_forwarded_for, so the
    // trustworthy hop is the rightmost entry. The first entry is whatever
    // the client sent — spoofable.
    const req = makeReq({
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
      remoteAddress: '127.0.0.1',
    });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('does not return a spoofed first X-Forwarded-For entry', () => {
    const req = makeReq({
      headers: { 'x-forwarded-for': '6.6.6.6' },
      remoteAddress: '127.0.0.1',
    });
    // Only one hop present — that hop *is* the trusted one (nginx-appended).
    expect(getClientIp(req)).toBe('6.6.6.6');
  });

  it('trims whitespace around X-Real-IP and XFF entries', () => {
    expect(
      getClientIp(
        makeReq({ headers: { 'x-real-ip': '  10.0.0.5  ' }, remoteAddress: '127.0.0.1' }),
      ),
    ).toBe('10.0.0.5');

    expect(
      getClientIp(
        makeReq({
          headers: { 'x-forwarded-for': ' 1.2.3.4 ,  10.0.0.5 ' },
          remoteAddress: '127.0.0.1',
        }),
      ),
    ).toBe('10.0.0.5');
  });

  it('falls back to socket.remoteAddress when no headers are set', () => {
    expect(getClientIp(makeReq({ remoteAddress: '127.0.0.1' }))).toBe('127.0.0.1');
  });

  it('returns "unknown" when nothing is available', () => {
    expect(getClientIp(makeReq({}))).toBe('unknown');
  });

  it('skips empty X-Real-IP and empty XFF entries', () => {
    const req = makeReq({
      headers: { 'x-real-ip': '   ', 'x-forwarded-for': ', , ,' },
      remoteAddress: '127.0.0.1',
    });
    expect(getClientIp(req)).toBe('127.0.0.1');
  });
});
