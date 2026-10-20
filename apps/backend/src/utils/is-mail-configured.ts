import type { Config } from '../config.js';

/**
 * True when the deployment can send mail. Single source of truth for
 * `createMailer`'s null decision and for the readiness probe's `emailEnabled`.
 */
export function isMailConfigured(config: Pick<Config, 'SMTP_HOST'>) {
  return config.SMTP_HOST !== undefined && config.SMTP_HOST !== '';
}
