import { HttpError } from '@datenknoten/kit';

export class MaxAppPasswordsExceededError extends HttpError {
  public readonly statusCode = 429;

  constructor(limit: number) {
    super(`Maximum number of app passwords (${limit}) exceeded`);
  }
}
