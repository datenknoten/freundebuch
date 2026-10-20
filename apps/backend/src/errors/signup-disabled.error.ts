import { ForbiddenError } from '@datenknoten/kit';

export class SignupDisabledError extends ForbiddenError {
  constructor() {
    super('Sign-up is disabled on this instance', { code: 'SIGNUP_DISABLED' });
  }
}
