import net from 'node:net';
import type { Logger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Config, loadConfig } from '../../src/config.js';
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
  close(): Promise<void>;
}

async function startSink() {
  const messages: string[] = [];
  const commands: string[] = [];

  function answerCommand(socket: net.Socket, line: string) {
    commands.push((line.split(' ')[0] ?? '').toUpperCase());
    if (line.startsWith('EHLO') === true || line.startsWith('HELO') === true) {
      socket.write('250-sink\r\n250 OK\r\n');
    } else if (line.startsWith('STARTTLS') === true) {
      // A relay without TLS: the sink cannot complete a handshake, so it
      // refuses the upgrade the way such a server does.
      socket.write('454 TLS not available\r\n');
    } else if (line.startsWith('MAIL') === true || line.startsWith('RCPT') === true) {
      socket.write('250 OK\r\n');
    } else if (line.startsWith('DATA') === true) {
      socket.write('354 send it\r\n');
    } else if (line.startsWith('QUIT') === true) {
      socket.write('221 bye\r\n');
      socket.end();
    } else {
      socket.write('250 OK\r\n');
    }
  }

  function handleSocket(socket: net.Socket) {
    let isInData = false;
    let buffer = '';

    function handleData(chunk: Buffer) {
      const text = chunk.toString();

      if (isInData === true) {
        buffer += text;
        if (buffer.includes('\r\n.\r\n') === true) {
          isInData = false;
          messages.push(buffer);
          buffer = '';
          socket.write('250 OK queued\r\n');
        }
        return;
      }

      for (const line of text.split('\r\n')) {
        if (line === '') {
          continue;
        }
        answerCommand(socket, line);
        if (line.startsWith('DATA') === true) {
          isInData = true;
        }
      }
    }

    socket.write('220 sink ESMTP\r\n');
    socket.on('error', ignore);
    socket.on('data', handleData);
  }

  const server = net.createServer(handleSocket);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  // A TCP listener always reports an AddressInfo, never a pipe name.
  const { port } = server.address() as net.AddressInfo;

  function close() {
    return new Promise<void>((resolve) => server.close(() => resolve()));
  }

  return { port, messages, commands, close };
}

function ignore() {
  return undefined;
}

function silentLogger() {
  // The mailer only calls these four levels; a full pino instance adds nothing.
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

function requireMailer(config: Config, logger: Logger) {
  const mailer = createMailer(config, logger);
  if (mailer === null) {
    throw new Error('mailer was null despite SMTP_HOST');
  }
  return mailer;
}

describe('createMailer', () => {
  let sink: Sink;

  beforeEach(async () => {
    vi.clearAllMocks();
    sink = await startSink();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
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

    const mailer = requireMailer(config, silentLogger());

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
    const mailer = requireMailer(smtpConfig(), silentLogger());

    await mailer.send('user@example.com', 'Subject', 'body');

    expect(sink.messages[0]).toContain('no-reply@friends.example.test');
  });

  it('prefers an explicit SMTP_FROM over the derived address', async () => {
    const mailer = requireMailer(
      smtpConfig({ SMTP_FROM: 'Freundebuch <hello@other.example>' }),
      silentLogger(),
    );

    await mailer.send('user@example.com', 'Subject', 'body');

    expect(sink.messages[0]).toContain('hello@other.example');
    expect(sink.messages[0]).not.toContain('no-reply@friends.example.test');
  });

  it('keeps the recipient out of the log line but records the subject', async () => {
    const logger = silentLogger();
    const mailer = requireMailer(smtpConfig(), logger);

    await mailer.send('user@example.com', 'Reset your password', 'body');

    expect(logger.info).toHaveBeenCalledWith({ subject: 'Reset your password' }, 'Email sent');
    const logged = JSON.stringify(vi.mocked(logger.info).mock.calls);
    expect(logged).not.toContain('user@example.com');
  });

  it('sends an html alternative only when one is supplied', async () => {
    const mailer = requireMailer(smtpConfig(), silentLogger());

    await mailer.send('user@example.com', 'Text only', 'just text');
    expect(sink.messages[0]).not.toContain('text/html');

    await mailer.send('user@example.com', 'With html', 'fallback', '<p>rich</p>');
    expect(sink.messages[1]).toContain('text/html');
  });

  it('refuses to send credentials over a relay that cannot upgrade to TLS', async () => {
    const mailer = requireMailer(
      smtpConfig({ SMTP_USER: 'relay-user', SMTP_PASSWORD: 'relay-password' }),
      silentLogger(),
    );

    await expect(mailer.send('user@example.com', 'Subject', 'body')).rejects.toThrow(/STARTTLS/i);
    expect(sink.commands).toContain('STARTTLS');
    expect(sink.messages).toHaveLength(0);
  });

  it('does not demand STARTTLS when no credentials are configured', async () => {
    const mailer = requireMailer(smtpConfig(), silentLogger());

    await mailer.send('user@example.com', 'Subject', 'body');

    expect(sink.commands).not.toContain('STARTTLS');
    expect(sink.messages).toHaveLength(1);
  });
});
