import type { Logger } from 'pino';
import type { Config } from '../utils/config.js';
import { ConfigurationError } from '../utils/errors.js';

/**
 * Outbound mail over SMTP.
 *
 * Mail is optional: a deployment without SMTP_HOST still works, it just cannot
 * deliver password resets or verification links. `createMailer` therefore
 * returns `null` instead of throwing, and every call site decides what to do
 * with a missing mailer (all of them log a warning today).
 *
 * The transport is built on the first actual send and cached per effective SMTP
 * configuration, so an instance without SMTP never opens a connection pool and
 * the readiness probe never constructs one.
 */

interface MailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SmtpTransport {
  sendMail(message: MailMessage): Promise<unknown>;
}

interface SmtpTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
}

interface NodemailerModule {
  createTransport(options: SmtpTransportOptions): SmtpTransport;
}

export interface Mailer {
  send(to: string, subject: string, text: string, html?: string): Promise<void>;
}

/**
 * True when the deployment can send mail. Single source of truth for
 * `createMailer`'s null decision and for the readiness probe's `emailEnabled`.
 */
export function isMailConfigured(config: Config): boolean {
  return config.SMTP_HOST !== undefined && config.SMTP_HOST !== '';
}

function hasCreateTransport(value: unknown): value is NodemailerModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'createTransport' in value &&
    typeof value.createTransport === 'function'
  );
}

/**
 * nodemailer is published as CJS with an ESM wrapper; depending on the
 * interop path `createTransport` sits on the namespace or on `default`.
 */
function resolveNodemailer(module: unknown): NodemailerModule {
  if (hasCreateTransport(module)) {
    return module;
  }
  if (
    typeof module === 'object' &&
    module !== null &&
    'default' in module &&
    hasCreateTransport(module.default)
  ) {
    return module.default;
  }
  throw new ConfigurationError('nodemailer does not expose createTransport');
}

// One transport (and therefore one SMTP connection pool) per effective SMTP
// configuration. The key makes a config change in tests or after a reload
// build a fresh transport instead of reusing a stale one.
let cached: { key: string; transport: SmtpTransport } | null = null;

async function getTransport(options: SmtpTransportOptions): Promise<SmtpTransport> {
  const key = `${options.host}:${options.port}:${options.secure}:${options.auth?.user ?? ''}`;
  if (cached !== null && cached.key === key) {
    return cached.transport;
  }

  // Imported here rather than at module scope so a deployment without SMTP
  // never loads it.
  const module: unknown = await import('nodemailer');

  const transport = resolveNodemailer(module).createTransport(options);
  cached = { key, transport };
  return transport;
}

function defaultFrom(config: Config): string {
  try {
    return `Freundebuch <no-reply@${new URL(config.FRONTEND_URL).hostname}>`;
  } catch {
    return 'Freundebuch <no-reply@localhost>';
  }
}

/**
 * @returns a mailer, or `null` when SMTP_HOST is unset.
 */
export function createMailer(config: Config, logger: Logger): Mailer | null {
  const host = config.SMTP_HOST;
  if (host === undefined || host === '') {
    return null;
  }

  // Port 465 is implicit TLS; 587/25 upgrade via STARTTLS. SMTP_SECURE lets an
  // operator override the guess for a non-standard port.
  const port = config.SMTP_PORT ?? (config.SMTP_SECURE ? 465 : 587);
  const options: SmtpTransportOptions = {
    host,
    port,
    secure: config.SMTP_SECURE,
    ...(config.SMTP_USER !== undefined && config.SMTP_USER !== ''
      ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD ?? '' } }
      : {}),
  };
  const from = config.SMTP_FROM ?? defaultFrom(config);

  return {
    send: async (to: string, subject: string, text: string, html?: string): Promise<void> => {
      const transport = await getTransport(options);
      await transport.sendMail({
        from,
        to,
        subject,
        text,
        ...(html !== undefined ? { html } : {}),
      });
      // Recipient stays out of the log line; pino redacts `email`, and the
      // subject is enough to correlate a delivery with a request.
      logger.info({ subject }, 'Email sent');
    },
  };
}
