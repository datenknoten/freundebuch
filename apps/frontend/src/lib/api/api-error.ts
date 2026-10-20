import { HttpError } from '@datenknoten/kit';

export interface ApiErrorOptions {
  code?: string;
  details?: unknown;
}

/** A non-2xx answer of the backend; `message`, `code` and `details` come from its error body. */
export class ApiError extends HttpError {
  public readonly statusCode: number;

  public constructor(statusCode: number, message: string, options: ApiErrorOptions = {}) {
    super(message, options);
    this.statusCode = statusCode;
  }
}
