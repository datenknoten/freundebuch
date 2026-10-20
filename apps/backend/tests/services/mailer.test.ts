import net from 'node:net';
import type { Logger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { createMailer } from '../../src/services/mailer.js';
import { isMailConfigured } from '../../src/utils/is-mail-configured.js';
import { TEST_ENV } from '../helpers/test-env.js';

const FRONTEND_URL = 'https://friends.example.test';

/**
 * Mail is verified against a real SMTP conversation rather than a mocked
 * nodemailer: the thing that can break is the wire exchange (a transport built
 * with the wrong port or `secure` flag connects and then hangs or rejects),
 * and a stubbed `createTransport` would report success for all of it.
 *
 * The sink speaks the minimum a client needs to complete a send and records
 * the DATA payload so the assertions can read the delivered message.
 */
interface Sink {
  port: number;
  /** Full DATA payloads, one per accepted message. */
  messages: string[];
  /** Every command verb the client sent, in order. */
  commands: string[];
  close: () => Promise<void>;
}

async function startSink(): Promise<Sink> {
  const messages: string[] = [];
  const commands: string[] = [];

  const server = net.createServer((socket) => {
    let inData = false;
    let buffer = '';

    socket.write('220 sink ESMTP\r\n');
    socket.on('error', () => undefined);
    socket.on('data', (chunk) => {
      const text = chunk.toString();

      if (inData) {
        buffer += text;
        if (buffer.includes('\r\n.\r\n')) {
          inData = false;
          messages.push(buffer);
          buffer = '';
          socket.write('250 OK queued\r\n');
        }
        return;
      }

      for (const line of text.split('\r\n').filter(Boolean)) {
        commands.push((line.split(' ')[0] ?? '').toUpperCase());
        if (line.startsWith('EHLO') || line.startsWith('HELO')) {
          socket.write('250-sink\r\n250 OK\r\n');
        } else if (line.startsWith('STARTTLS')) {
          // A relay without TLS: the sink cannot complete a handshake, so it
          // refuses the upgrade the way such a server does.
          socket.write('454 TLS not available\r\n');
        } else if (line.startsWith('MAIL') || line.startsWith('RCPT')) {
          socket.write('250 OK\r\n');
        } else if (line.startsWith('DATA')) {
          inData = true;
          socket.write('354 send it\r\n');
        } else if (line.startsWith('QUIT')) {
          socket.write('221 bye\r\n');
          socket.end();
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;

  return {
    port,
    messages,
    commands,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function silentLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

describe('SMTP mailer', () => {
  let sink: Sink;

  beforeEach(async () => {
    sink = await startSink();
  });

  afterEach(async () => {
    await sink.close();
  });

  /** A config pointing the mailer at the local sink. */
  function smtpConfig(env: Record<string, string> = {}) {
    return loadConfig({
      ...TEST_ENV,
      FRONTEND_URL,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(sink.port),
      SMTP_SECURE: 'false',
      ...env,
    });
  }

  it('returns null and reports unconfigured when SMTP_HOST is unset', () => {
    const config = loadConfig({ ...TEST_ENV, FRONTEND_URL });

    expect(isMailConfigured(config)).toBe(false);
    expect(createMailer(config, silentLogger())).toBeNull();
  });

  it('delivers the subject, body and recipient over SMTP', async () => {
    const config = smtpConfig();
    expect(isMailConfigured(config)).toBe(true);

    const mailer = createMailer(config, silentLogger());
    if (mailer === null) throw new Error('mailer was null despite SMTP_HOST');

    await mailer.send(
      'user@example.com',
      'Passwort zurücksetzen',
      'https://friends.example.test/reset?token=abc',
    );

    expect(sink.messages).toHaveLength(1);
    const message = sink.messages[0];
    expect(message).toContain('To: user@example.com');
    // The subject is non-ASCII, so it travels encoded rather than literally.
    expect(message).toMatch(/Subject:.+/);
    expect(message).toContain('https://friends.example.test/reset?token=abc');
  });

  it('derives the From address from FRONTEND_URL when SMTP_FROM is unset', async () => {
    const mailer = createMailer(smtpConfig(), silentLogger());
    if (mailer === null) throw new Error('mailer was null despite SMTP_HOST');

    await mailer.send('user@example.com', 'Subject', 'body');

    expect(sink.messages[0]).toContain('no-reply@friends.example.test');
  });

  it('prefers an explicit SMTP_FROM over the derived address', async () => {
    const mailer = createMailer(
      smtpConfig({ SMTP_FROM: 'Freundebuch <hello@other.example>' }),
      silentLogger(),
    );
    if (mailer === null) throw new Error('mailer was null despite SMTP_HOST');

    await mailer.send('user@example.com', 'Subject', 'body');

    expect(sink.messages[0]).toContain('hello@other.example');
    expect(sink.messages[0]).not.toContain('no-reply@friends.example.test');
  });

  it('keeps the recipient out of the log line but records the subject', async () => {
    const logger = silentLogger();
    const mailer = createMailer(smtpConfig(), logger);
    if (mailer === null) throw new Error('mailer was null despite SMTP_HOST');

    await mailer.send('user@example.com', 'Reset your password', 'body');

    expect(logger.info).toHaveBeenCalledWith({ subject: 'Reset your password' }, 'Email sent');
    const logged = JSON.stringify(
      (logger.info as unknown as { mock: { calls: unknown[] } }).mock.calls,
    );
    expect(logged).not.toContain('user@example.com');
  });

  it('sends an html alternative only when one is supplied', async () => {
    const mailer = createMailer(smtpConfig(), silentLogger());
    if (mailer === null) throw new Error('mailer was null despite SMTP_HOST');

    await mailer.send('user@example.com', 'Text only', 'just text');
    expect(sink.messages[0]).not.toContain('text/html');

    await mailer.send('user@example.com', 'With html', 'fallback', '<p>rich</p>');
    expect(sink.messages[1]).toContain('text/html');
  });

  it('refuses to send credentials over a relay that cannot upgrade to TLS', async () => {
    const mailer = createMailer(
      smtpConfig({ SMTP_USER: 'relay-user', SMTP_PASSWORD: 'relay-password' }),
      silentLogger(),
    );
    if (mailer === null) throw new Error('mailer was null despite SMTP_HOST');

    await expect(mailer.send('user@example.com', 'Subject', 'body')).rejects.toThrow(/STARTTLS/i);
    expect(sink.commands).toContain('STARTTLS');
    expect(sink.messages).toHaveLength(0);
  });

  it('does not demand STARTTLS when no credentials are configured', async () => {
    const mailer = createMailer(smtpConfig(), silentLogger());
    if (mailer === null) throw new Error('mailer was null despite SMTP_HOST');

    await mailer.send('user@example.com', 'Subject', 'body');

    expect(sink.commands).not.toContain('STARTTLS');
    expect(sink.messages).toHaveLength(1);
  });
});
