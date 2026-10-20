import { HttpError } from '@datenknoten/kit';

export class ExternalServiceError extends HttpError {
  public readonly statusCode = 502;
  public readonly service: string;
  public readonly originalStatus?: number;

  constructor(service: string, message: string, originalStatus?: number, details?: unknown) {
    super(message, { details });
    this.service = service;
    if (originalStatus !== undefined) {
      this.originalStatus = originalStatus;
    }
  }
}
