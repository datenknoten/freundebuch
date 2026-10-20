import { parseWith } from '@datenknoten/kit/schema';
import type { Logger } from 'pino';
import { type Readable, readable } from 'svelte/store';
import { browser } from '$app/environment';
import { ReadinessResponseSchema } from '$shared';

export interface InstanceStoreOptions {
  logger: Logger;
}

/**
 * Instance capabilities, read from the backend readiness probe. Today only whether registration
 * is open: a private instance sets `DISABLE_SIGNUP=true`, and the register link disappears.
 *
 * The probe runs at most once per page session and never on the server. It fails open: when the
 * probe cannot be read, the link stays and the backend remains the authority.
 */
export class InstanceStore {
  public readonly signupEnabled: Readable<boolean>;
  private readonly logger: Logger;
  private probe: Promise<boolean> | undefined;

  public constructor(options: InstanceStoreOptions) {
    this.logger = options.logger;
    this.signupEnabled = readable(true, (set) => void this.publishSignupEnabled(set));
  }

  private async publishSignupEnabled(set: (isEnabled: boolean) => void) {
    if (browser === false) {
      return;
    }
    this.probe ??= this.probeSignupEnabled();
    set(await this.probe);
  }

  private async probeSignupEnabled() {
    try {
      // A 503 (not ready) still carries the capabilities, so the status is not checked.
      const response = await fetch('/health/ready', { credentials: 'omit' });
      const readiness = parseWith(ReadinessResponseSchema, await response.json());
      return readiness.signupEnabled;
    } catch (err) {
      this.logger.warn({ err }, 'Failed to read the instance readiness');
      return true;
    }
  }
}
