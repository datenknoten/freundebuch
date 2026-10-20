import { UnauthorizedError } from '@datenknoten/kit';

/** The auth server refused a sign-up or sign-in; the message is the server's reason. */
export class AuthError extends UnauthorizedError {
  public constructor(message: string) {
    super(message, { code: 'AUTH_FAILED' });
  }
}
