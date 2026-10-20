import { UnauthorizedError } from '@datenknoten/kit';

/** The default message stays generic so a failed login does not reveal which accounts exist. */
export class AuthenticationError extends UnauthorizedError {
  constructor(message = 'Invalid credentials') {
    super(message);
  }
}
