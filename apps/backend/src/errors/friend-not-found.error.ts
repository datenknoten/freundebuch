import { NotFoundError } from '@datenknoten/kit';

export class FriendNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Friend', id);
  }
}
