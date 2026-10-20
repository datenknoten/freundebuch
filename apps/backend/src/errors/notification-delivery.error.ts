import { ExternalServiceError } from './external-service.error.js';

export class NotificationDeliveryError extends ExternalServiceError {
  /** Raw upstream response body, kept for logging and never sent to the client. */
  public readonly detail?: string;

  constructor(platform: string, detail?: string, originalStatus?: number) {
    // The client-facing message stays generic: a third-party response body is
    // untrusted input and must not be echoed back through the API.
    super(platform, `Failed to deliver ${platform} notification`, originalStatus);
    if (detail !== undefined) {
      this.detail = detail;
    }
  }
}
