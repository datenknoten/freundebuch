import { NotFoundError } from '@datenknoten/kit';

export class UserNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('User', id);
  }
}
